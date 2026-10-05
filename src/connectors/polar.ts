import { register } from "./registry";
import type { Credentials, RevenueLine, Snapshot, SyncRange } from "./types";
import { getJson } from "./types";

const BASE = "https://api.polar.sh/v1";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.token}` });

type Period = {
	timestamp: string;
	revenue: number | null;
	net_revenue: number | null;
	monthly_recurring_revenue: number | null;
	active_subscriptions: number | null;
};
type Metrics = { periods: Period[] };

// Polar reports in cents with no currency field; organizations bill in USD
// unless configured otherwise.
const CURRENCY = "USD";

async function metrics(
	c: Credentials,
	from: string,
	to: string,
	interval: "day" | "month",
) {
	return getJson<Metrics>(
		`${BASE}/metrics/?start_date=${from}&end_date=${to}&interval=${interval}&timezone=UTC`,
		{ headers: headers(c) },
	);
}

export const polar = register({
	id: "polar",
	name: "Polar",
	kind: "revenue",
	auth: {
		kind: "key",
		fields: [
			{
				name: "token",
				label: "Organization access token",
				placeholder: "polar_oat_…",
				secret: true,
			},
		],
		createUrl: "https://polar.sh/to/dashboard/settings",
		scopes: ["organizations:read", "metrics:read"],
	},
	async verify(c) {
		const r = await getJson<{ items: { name: string }[] }>(
			`${BASE}/organizations/?limit=1`,
			{ headers: headers(c) },
		);
		return { label: r.items[0]?.name ?? "Polar" };
	},
	// One line per day from the metrics endpoint: gross and net, so Polar's
	// fee is the difference.
	async fetchRevenue(c, range: SyncRange) {
		const m = await metrics(c, range.from, range.to, "day");
		const out: RevenueLine[] = [];
		for (const p of m.periods) {
			const gross = p.revenue ?? 0;
			const net = p.net_revenue ?? gross;
			if (!gross && !net) continue;
			out.push({
				externalId: `day:${p.timestamp.slice(0, 10)}`,
				date: p.timestamp.slice(0, 10),
				currency: CURRENCY,
				grossCents: gross,
				feesCents: gross - net,
				refundsCents: 0,
				netCents: net,
				kind: "subscription",
			});
		}
		return out;
	},
	async fetchSnapshots(c, date): Promise<Snapshot[]> {
		const m = await metrics(c, date.slice(0, 7).concat("-01"), date, "month");
		const last = m.periods[m.periods.length - 1];
		if (!last) return [];
		return [
			{
				date,
				metric: "mrr_base_cents",
				value: last.monthly_recurring_revenue ?? 0,
				currency: CURRENCY,
			},
			{ date, metric: "customers", value: last.active_subscriptions ?? 0 },
		];
	},
});
