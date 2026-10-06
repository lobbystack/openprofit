import { register } from "./registry";
import {
	type CostLine,
	type Credentials,
	getJson,
	type SyncRange,
	toCents,
} from "./types";

const BASE = "https://api.github.com";
const headers = (c: Credentials) => ({
	Authorization: `Bearer ${c.token}`,
	Accept: "application/vnd.github+json",
	"X-GitHub-Api-Version": "2026-03-10",
	"User-Agent": "OpenProfit",
});

type Item = {
	date: string;
	product: string;
	sku: string;
	netAmount: number;
	repositoryName?: string;
};

// The usage report for an organization, or the token's own account.
async function usageUrl(c: Credentials) {
	const org = c.org?.trim();
	if (org)
		return `${BASE}/organizations/${encodeURIComponent(org)}/settings/billing/usage`;
	// https://docs.github.com/en/rest/users/users#get-the-authenticated-user
	const me = await getJson<{ login: string }>(`${BASE}/user`, {
		headers: headers(c),
	});
	return `${BASE}/users/${me.login}/settings/billing/usage`;
}

// One line per day, SKU and repository. netAmount is USD after included
// minutes and other discounts.
export function usageLines(items: Item[]): CostLine[] {
	const sums = new Map<string, { item: Item; dollars: number }>();
	for (const i of items) {
		const key = `${i.date.slice(0, 10)}:${i.product}:${i.sku}:${i.repositoryName ?? ""}`;
		const s = sums.get(key) ?? { item: i, dollars: 0 };
		s.dollars += i.netAmount;
		sums.set(key, s);
	}
	const out: CostLine[] = [];
	for (const [key, { item, dollars }] of sums) {
		const cents = toCents(dollars);
		if (!cents) continue;
		out.push({
			externalId: key,
			date: item.date.slice(0, 10),
			currency: "USD",
			amountCents: cents,
			service: item.sku,
			subUnitId: item.repositoryName || undefined,
			subUnitLabel: item.repositoryName || undefined,
		});
	}
	return out;
}

export const github = register({
	id: "github",
	name: "GitHub",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{
				name: "token",
				label: "Fine-grained token",
				placeholder: "github_pat_…",
				secret: true,
			},
			{
				name: "org",
				label: "Organization (leave empty for your personal account)",
				placeholder: "acme",
				optional: true,
			},
		],
		createUrl: "https://github.com/settings/personal-access-tokens/new",
		scopes: [
			"Organization: resource owner is the organization, Administration · Read-only",
			"Personal account: Plan · Read-only",
		],
	},
	async verify(c) {
		const org = c.org?.trim();
		let label: string;
		if (org) {
			// https://docs.github.com/en/rest/orgs/orgs#get-an-organization
			const o = await getJson<{ login: string; name: string | null }>(
				`${BASE}/orgs/${encodeURIComponent(org)}`,
				{ headers: headers(c) },
			);
			label = o.name || o.login;
		} else {
			// https://docs.github.com/en/rest/users/users#get-the-authenticated-user
			const me = await getJson<{ login: string }>(`${BASE}/user`, {
				headers: headers(c),
			});
			label = me.login;
		}
		const now = new Date();
		// https://docs.github.com/en/rest/billing/usage#get-billing-usage-report-for-an-organization
		await getJson(
			`${await usageUrl(c)}?year=${now.getUTCFullYear()}&month=${now.getUTCMonth() + 1}`,
			{ headers: headers(c) },
		);
		return { label };
	},
	// One request per month; the report has no pagination.
	async fetchCosts(c, range: SyncRange) {
		const url = await usageUrl(c);
		const items: Item[] = [];
		const d = new Date(`${range.from.slice(0, 7)}-01T00:00:00Z`);
		const end = new Date(`${range.to.slice(0, 7)}-01T00:00:00Z`);
		for (; d <= end; d.setUTCMonth(d.getUTCMonth() + 1)) {
			// https://docs.github.com/en/rest/billing/usage#get-billing-usage-report-for-an-organization
			// https://docs.github.com/en/rest/billing/usage#get-billing-usage-report-for-a-user
			const r = await getJson<{ usageItems?: Item[] }>(
				`${url}?year=${d.getUTCFullYear()}&month=${d.getUTCMonth() + 1}`,
				{ headers: headers(c) },
			);
			items.push(...(r.usageItems ?? []));
		}
		return usageLines(items);
	},
});
