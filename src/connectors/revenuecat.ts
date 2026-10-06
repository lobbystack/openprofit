import { register } from "./registry";
import {
	type Credentials,
	getJson,
	type RevenueLine,
	type Snapshot,
	type SyncRange,
	toCents,
} from "./types";

const BASE = "https://api.revenuecat.com/v2";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.key}` });

type Project = { id: string; name: string };
type RevenueMetric = { currency: string; value: number };

// A v2 secret key belongs to one project; the list returns it.
// https://www.revenuecat.com/docs/api-v2/project
async function projects(c: Credentials) {
	const r = await getJson<{ items: Project[] }>(`${BASE}/projects?limit=100`, {
		headers: headers(c),
	});
	return r.items;
}

// First and last day of every month the range touches. Months are always
// read whole, so a short reread replaces the month's line with the full
// month, never a few days of it.
export function months(range: SyncRange) {
	const out: { month: string; from: string; to: string }[] = [];
	let m = range.from.slice(0, 7);
	while (m <= range.to.slice(0, 7)) {
		const [y, mo] = m.split("-").map(Number);
		const last = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
		out.push({
			month: m,
			from: `${m}-01`,
			to: last < range.to ? last : range.to,
		});
		m = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
	}
	return out;
}

// One line per project and month. RevenueCat's revenue already subtracts
// refunds. Gross is revenue net of taxes; net is proceeds, after the store's
// commission. Both taxes and commission are RevenueCat's estimates.
export function rcLine(
	project: Project,
	month: string,
	netOfTaxes: RevenueMetric,
	proceeds: RevenueMetric,
): RevenueLine | null {
	const gross = toCents(netOfTaxes.value);
	const net = toCents(proceeds.value);
	if (!gross && !net) return null;
	return {
		externalId: `${project.id}:${month}`,
		date: `${month}-01`,
		currency: netOfTaxes.currency.toUpperCase(),
		grossCents: gross,
		feesCents: gross - net,
		refundsCents: 0,
		netCents: net,
		kind: "other",
		subUnitId: project.id,
		subUnitLabel: project.name,
	};
}

export const revenuecat = register({
	id: "revenuecat",
	name: "RevenueCat",
	kind: "revenue",
	auth: {
		kind: "key",
		fields: [
			{
				name: "key",
				label: "Secret API key (v2)",
				placeholder: "sk_…",
				secret: true,
			},
		],
		createUrl: "https://app.revenuecat.com/",
		scopes: [
			"project_configuration:projects:read",
			"charts_metrics:overview:read",
		],
	},
	async verify(c) {
		const p = await projects(c);
		return { label: p.map((x) => x.name).join(", ") || "RevenueCat" };
	},
	// The revenue metric totals an inclusive date range in the project's
	// currency. Charts & Metrics allows 25 requests a minute, so months, not
	// days: two years is 48 requests.
	// https://www.revenuecat.com/docs/api-v2/charts-and-metrics
	async fetchRevenue(c, range: SyncRange) {
		const out: RevenueLine[] = [];
		for (const p of await projects(c)) {
			for (const m of months(range)) {
				const get = (type: string) =>
					getJson<RevenueMetric>(
						`${BASE}/projects/${p.id}/metrics/revenue?start_date=${m.from}&end_date=${m.to}&revenue_type=${type}`,
						{ headers: headers(c) },
					);
				const line = rcLine(
					p,
					m.month,
					await get("revenue_net_of_taxes"),
					await get("proceeds"),
				);
				if (line) out.push(line);
			}
		}
		return out;
	},
	// Overview metrics are documented by display name; ids are matched too.
	// https://www.revenuecat.com/docs/api-v2/charts-and-metrics
	// https://www.revenuecat.com/docs/dashboard-and-metrics/overview
	async fetchSnapshots(c, date): Promise<Snapshot[]> {
		let mrr = 0;
		let subs = 0;
		let currency = "USD";
		for (const p of await projects(c)) {
			const o = await getJson<{
				currency: string;
				metrics: { id: string; name: string; value: number }[];
			}>(`${BASE}/projects/${p.id}/metrics/overview`, { headers: headers(c) });
			currency = o.currency;
			const find = (id: string, name: string) =>
				o.metrics.find((m) => m.id === id || m.name === name)?.value ?? 0;
			mrr += find("mrr", "MRR");
			subs += find("active_subscriptions", "Active Subscriptions");
		}
		return [
			{
				date,
				metric: "mrr_base_cents",
				value: toCents(mrr),
				currency: currency.toUpperCase(),
			},
			{ date, metric: "customers", value: subs },
		];
	},
});
