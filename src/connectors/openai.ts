import { register } from "./registry";
import {
	type CostLine,
	type Credentials,
	dayOf,
	getJson,
	type SyncRange,
	toCents,
} from "./types";

const BASE = "https://api.openai.com/v1/organization";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.key}` });
const unix = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 1000);

type CostsPage = {
	data: {
		start_time: number;
		results: {
			amount: { value: number; currency: string };
			line_item: string | null;
			project_id: string | null;
		}[];
	}[];
	has_more: boolean;
	next_page: string | null;
};

export const openai = register({
	id: "openai",
	name: "OpenAI",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{
				name: "key",
				label: "Admin key",
				placeholder: "sk-admin-…",
				secret: true,
			},
		],
		createUrl: "https://platform.openai.com/settings/organization/admin-keys",
		scopes: ["Organization admin key (read access to costs)"],
	},
	async verify(c) {
		const r = await getJson<{ data: { name: string }[] }>(
			`${BASE}/projects?limit=1`,
			{
				headers: headers(c),
			},
		);
		return { label: r.data[0]?.name ?? "OpenAI" };
	},
	async fetchCosts(c, range: SyncRange) {
		const out: CostLine[] = [];
		// 31-day windows keep each request inside the documented bucket limits.
		for (
			let start = unix(range.from);
			start <= unix(range.to);
			start += 31 * 86_400
		) {
			const end = Math.min(start + 31 * 86_400, unix(range.to) + 86_400);
			let page: string | null = null;
			do {
				const url = `${BASE}/costs?start_time=${start}&end_time=${end}&bucket_width=1d&group_by=project_id&group_by=line_item&limit=31${page ? `&page=${page}` : ""}`;
				const res: CostsPage = await getJson<CostsPage>(url, {
					headers: headers(c),
				});
				for (const bucket of res.data) {
					for (const r of bucket.results) {
						if (!r.amount?.value) continue;
						const project = r.project_id ?? "default";
						out.push({
							externalId: `${bucket.start_time}:${project}:${r.line_item ?? "all"}`,
							date: dayOf(bucket.start_time),
							currency: (r.amount.currency ?? "usd").toUpperCase(),
							amountCents: toCents(r.amount.value),
							service: r.line_item ?? undefined,
							subUnitId: project,
						});
					}
				}
				page = res.has_more ? res.next_page : null;
			} while (page);
		}
		return out;
	},
});
