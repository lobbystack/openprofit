import { register } from "./registry";
import type { CostLine, Credentials, SyncRange } from "./types";
import { getJson } from "./types";

const BASE = "https://api.anthropic.com/v1/organizations";
const headers = (c: Credentials) => ({
	"x-api-key": c.key,
	"anthropic-version": "2023-06-01",
});

type Report = {
	data: {
		starting_at: string;
		results: {
			amount: string; // decimal string, cents
			currency: string;
			workspace_id: string | null;
			description: string | null;
		}[];
	}[];
	has_more: boolean;
	next_page: string | null;
};

const addDays = (d: string, n: number) =>
	new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000)
		.toISOString()
		.slice(0, 10);

export const anthropic = register({
	id: "anthropic",
	name: "Anthropic",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{
				name: "key",
				label: "Admin key",
				placeholder: "sk-ant-admin01-…",
				secret: true,
			},
		],
		createUrl: "https://platform.claude.com/settings/admin-keys",
		scopes: ["Admin key (organization accounts only)"],
	},
	async verify(c) {
		const me = await getJson<{ name: string }>(`${BASE}/me`, {
			headers: headers(c),
		});
		return { label: me.name };
	},
	async fetchCosts(c, range: SyncRange) {
		const out: CostLine[] = [];
		// 31 buckets per request is the documented maximum.
		for (let from = range.from; from <= range.to; from = addDays(from, 31)) {
			const to =
				addDays(from, 31) < range.to ? addDays(from, 31) : addDays(range.to, 1);
			let page: string | null = null;
			do {
				const url = `${BASE}/cost_report?starting_at=${from}T00:00:00Z&ending_at=${to}T00:00:00Z&bucket_width=1d&group_by[]=workspace_id&group_by[]=description&limit=31${page ? `&page=${page}` : ""}`;
				const res: Report = await getJson<Report>(url, { headers: headers(c) });
				for (const bucket of res.data) {
					const date = bucket.starting_at.slice(0, 10);
					for (const r of bucket.results) {
						const cents = Math.round(Number.parseFloat(r.amount));
						if (!cents) continue;
						const ws = r.workspace_id ?? "default";
						out.push({
							externalId: `${date}:${ws}:${r.description ?? "all"}`,
							date,
							currency: (r.currency ?? "USD").toUpperCase(),
							amountCents: cents,
							service: r.description ?? undefined,
							subUnitId: ws,
						});
					}
				}
				page = res.has_more ? res.next_page : null;
			} while (page);
		}
		return out;
	},
});
