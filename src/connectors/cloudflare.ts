import { register } from "./registry";
import {
	ConnectorError,
	type CostLine,
	type Credentials,
	getJson,
	type SyncRange,
	toCents,
} from "./types";

const BASE = "https://api.cloudflare.com/client/v4";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.token}` });

type Envelope<T> = {
	success: boolean;
	result: T;
	errors: { message: string }[];
	result_info?: { page: number; per_page: number; total_count?: number };
};

async function accountId(c: Credentials) {
	if (c.accountId?.trim()) return c.accountId.trim();
	const r = await getJson<Envelope<{ id: string }[]>>(
		`${BASE}/accounts?per_page=1`,
		{
			headers: headers(c),
		},
	);
	if (!r.result[0])
		throw new ConnectorError("No account visible to this token.");
	return r.result[0].id;
}

type Usage = {
	BilledCost: number;
	BillingCurrency: string;
	ChargePeriodStart: string;
	ChargeDescription?: string;
	ServiceName: string;
	ZoneId?: string;
	ZoneName?: string;
};
type Invoice = {
	id: string;
	amount: number;
	currency: string;
	occurred_at: string;
	description: string;
};

export const cloudflare = register({
	id: "cloudflare",
	name: "Cloudflare",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{ name: "token", label: "API token", secret: true },
			{ name: "accountId", label: "Account id (optional)", optional: true },
		],
		createUrl: "https://dash.cloudflare.com/profile/api-tokens",
		scopes: ["Account · Billing · Read", "Account · Account Settings · Read"],
	},
	async verify(c) {
		await getJson<Envelope<{ status: string }>>(`${BASE}/user/tokens/verify`, {
			headers: headers(c),
		});
		const id = await accountId(c);
		const a = await getJson<Envelope<{ name: string }>>(
			`${BASE}/accounts/${id}`,
			{
				headers: headers(c),
			},
		);
		return { label: a.result.name };
	},
	// Billable usage (FOCUS fields) when the account has it; invoices otherwise.
	async fetchCosts(c, range: SyncRange) {
		const id = await accountId(c);
		const out: CostLine[] = [];
		try {
			const u = await getJson<Envelope<Usage[]>>(
				`${BASE}/accounts/${id}/billable-usage?from=${range.from}&to=${range.to}`,
				{ headers: headers(c) },
			);
			for (const r of u.result ?? []) {
				if (!r.BilledCost) continue;
				const date = r.ChargePeriodStart.slice(0, 10);
				out.push({
					externalId: `usage:${date}:${r.ServiceName}:${r.ChargeDescription ?? ""}:${r.ZoneId ?? ""}`,
					date,
					currency: (r.BillingCurrency ?? "USD").toUpperCase(),
					amountCents: toCents(r.BilledCost),
					service: r.ServiceName,
					subUnitId: r.ZoneId,
					subUnitLabel: r.ZoneName,
				});
			}
			return out;
		} catch (err) {
			if (
				!(err instanceof ConnectorError) ||
				!err.status ||
				err.status < 400 ||
				err.status >= 500
			)
				throw err;
		}
		// Every page of the history, so a full sync sees every invoice.
		// https://developers.cloudflare.com/api/resources/user/subresources/billing/subresources/history/methods/list/
		const invoices: Invoice[] = [];
		for (let page = 1; ; page++) {
			const h = await getJson<Envelope<Invoice[]>>(
				`${BASE}/accounts/${id}/billing/history?per_page=50&page=${page}`,
				{ headers: headers(c) },
			);
			const rows = h.result ?? [];
			invoices.push(...rows);
			const total = h.result_info?.total_count;
			if (rows.length < 50 || (total !== undefined && invoices.length >= total))
				break;
		}
		for (const inv of invoices) {
			const date = inv.occurred_at.slice(0, 10);
			if (date < range.from || date > range.to || !inv.amount) continue;
			out.push({
				externalId: `invoice:${inv.id}`,
				date,
				currency: (inv.currency ?? "USD").toUpperCase(),
				amountCents: toCents(inv.amount),
				service: inv.description,
			});
		}
		return out;
	},
});
