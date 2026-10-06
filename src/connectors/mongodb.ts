import { register } from "./registry";
import {
	ConnectorError,
	type CostLine,
	type Credentials,
	getJson,
	type SyncRange,
} from "./types";

const BASE = "https://cloud.mongodb.com";
const ACCEPT = "application/vnd.atlas.2023-01-01+json";

// A service account trades its client id and secret for a one-hour token.
// https://www.mongodb.com/docs/atlas/api/service-accounts/generate-oauth2-token/ (read 2026-10-06)
async function auth(c: Credentials) {
	const basic = Buffer.from(`${c.clientId}:${c.clientSecret}`).toString(
		"base64",
	);
	const t = await getJson<{ access_token: string }>(`${BASE}/api/oauth/token`, {
		method: "POST",
		headers: {
			Authorization: `Basic ${basic}`,
			Accept: "application/json",
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: "grant_type=client_credentials",
	});
	return { Authorization: `Bearer ${t.access_token}`, Accept: ACCEPT };
}

type Org = { id: string; name: string; isDeleted?: boolean };

// https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-listorgs (read 2026-10-06)
async function org(c: Credentials, headers: Record<string, string>) {
	const id = c.orgId?.trim();
	if (id) return getJson<Org>(`${BASE}/api/atlas/v2/orgs/${id}`, { headers });
	const r = await getJson<{ results: Org[] }>(`${BASE}/api/atlas/v2/orgs`, {
		headers,
	});
	const live = r.results.filter((o) => !o.isDeleted);
	if (live.length !== 1)
		throw new ConnectorError(
			live.length
				? "This service account sees several organizations. Set the organization id."
				: "No organization on this service account.",
		);
	return live[0];
}

type Invoice = { id: string; startDate: string; endDate: string };
type LineItem = {
	startDate: string;
	groupId?: string;
	groupName?: string;
	clusterName?: string;
	stitchAppName?: string;
	sku?: string;
	tierLowerBound?: number;
	totalPriceCents?: number;
	discountCents?: number;
};

// Line items carry no id, so every dimension makes one. The pending invoice
// keeps updating the same lines, which then overwrite instead of adding up.
export function itemLines(items: LineItem[]): CostLine[] {
	const lines = new Map<string, CostLine>();
	for (const li of items) {
		// totalPriceCents is unitPriceDollars × quantity, before the discount.
		const cents = (li.totalPriceCents ?? 0) - (li.discountCents ?? 0);
		if (!cents) continue;
		const date = li.startDate.slice(0, 10);
		const externalId = [
			date,
			li.groupId ?? "",
			li.clusterName ?? "",
			li.stitchAppName ?? "",
			li.sku ?? "",
			li.tierLowerBound ?? "",
		].join(":");
		const prev = lines.get(externalId);
		if (prev) prev.amountCents += cents;
		else
			lines.set(externalId, {
				externalId,
				date,
				currency: "USD",
				amountCents: cents,
				service: li.sku,
				subUnitId: li.groupId,
				subUnitLabel: li.groupName,
			});
	}
	return [...lines.values()];
}

export const mongodb = register({
	id: "mongodb",
	name: "MongoDB Atlas",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{ name: "clientId", label: "Client id" },
			{
				name: "clientSecret",
				label: "Client secret",
				placeholder: "mdb_sa_sk_…",
				secret: true,
			},
			{
				name: "orgId",
				label: "Organization id (optional)",
				optional: true,
			},
		],
		// The docs' link to the service accounts page of the current organization.
		// https://www.mongodb.com/docs/atlas/configure-api-access/ (read 2026-10-06)
		createUrl:
			"https://cloud.mongodb.com/go?l=https%3A%2F%2Fcloud.mongodb.com%2Fv2%23%2Forg%2F%3Corganization%3E%2Faccess%2FserviceAccounts",
		scopes: [
			"Organization service account with the Organization Billing Viewer role",
			"An API access list entry for the server running OpenProfit",
		],
	},
	async verify(c) {
		const headers = await auth(c);
		const o = await org(c, headers);
		await getJson(`${BASE}/api/atlas/v2/orgs/${o.id}/invoices?itemsPerPage=1`, {
			headers,
		});
		return { label: o.name };
	},
	// Invoices are monthly; their line items are daily, per project, cluster
	// and SKU. The list includes the pending invoice for the current month.
	async fetchCosts(c, range: SyncRange) {
		const headers = await auth(c);
		const { id } = await org(c, headers);
		const items: LineItem[] = [];
		const perPage = 100;
		for (let page = 1; ; page++) {
			// Newest end date first.
			// https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-listorginvoices (read 2026-10-06)
			const r = await getJson<{ results: Invoice[] }>(
				`${BASE}/api/atlas/v2/orgs/${id}/invoices?itemsPerPage=${perPage}&pageNum=${page}&sortBy=END_DATE&orderBy=desc&viewLinkedInvoices=false`,
				{ headers },
			);
			let older = false;
			for (const inv of r.results) {
				if (inv.endDate.slice(0, 10) < range.from) {
					older = true;
					break;
				}
				if (inv.startDate.slice(0, 10) > range.to) continue;
				// https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-getorginvoice (read 2026-10-06)
				const full = await getJson<{ lineItems?: LineItem[] }>(
					`${BASE}/api/atlas/v2/orgs/${id}/invoices/${inv.id}`,
					{ headers },
				);
				items.push(...(full.lineItems ?? []));
			}
			if (older || r.results.length < perPage) break;
		}
		return itemLines(items);
	},
});
