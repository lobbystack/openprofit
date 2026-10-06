import { register } from "./registry";
import { type CostLine, type Credentials, getJson, splitCents } from "./types";

const API = "https://api.resend.com";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.key}` });

// Resend reports email counts, not dollars. Transactional plans, read
// 2026-10-06 from https://resend.com/pricing and
// https://resend.com/docs/knowledge-base/what-is-resend-pricing.md.
// Cents per month, and cents per 1,000 emails over the included volume.
export const RESEND_TIERS: Record<
	string,
	{ label: string; emails: number; fee: number; per1k: number }
> = {
	free: { label: "Free", emails: 3_000, fee: 0, per1k: 0 },
	"pro-50k": {
		label: "Pro, 50k emails",
		emails: 50_000,
		fee: 2_000,
		per1k: 90,
	},
	"pro-100k": {
		label: "Pro, 100k emails",
		emails: 100_000,
		fee: 3_500,
		per1k: 90,
	},
	"scale-100k": {
		label: "Scale, 100k emails",
		emails: 100_000,
		fee: 9_000,
		per1k: 90,
	},
	"scale-200k": {
		label: "Scale, 200k emails",
		emails: 200_000,
		fee: 16_000,
		per1k: 80,
	},
	"scale-500k": {
		label: "Scale, 500k emails",
		emails: 500_000,
		fee: 35_000,
		per1k: 70,
	},
	"scale-1m": {
		label: "Scale, 1M emails",
		emails: 1_000_000,
		fee: 65_000,
		per1k: 65,
	},
	"scale-1.5m": {
		label: "Scale, 1.5M emails",
		emails: 1_500_000,
		fee: 82_500,
		per1k: 52,
	},
	"scale-2.5m": {
		label: "Scale, 2.5M emails",
		emails: 2_500_000,
		fee: 115_000,
		per1k: 46,
	},
};
// The Free plan stops at 100 emails a day and has no overage (same pages).
const FREE_DAILY = 100;

const cost = (t: (typeof RESEND_TIERS)[string], emails: number) =>
	t.fee + Math.round((Math.max(0, emails - t.emails) * t.per1k) / 1000);

// Detection prices a month at the cheapest plan that could have sent it.
// Free only fits under its monthly and daily caps.
export function cheapestTier(emails: number, busiestDay: number) {
	let best = RESEND_TIERS["pro-50k"];
	for (const [id, t] of Object.entries(RESEND_TIERS)) {
		if (id === "free" && (emails > t.emails || busiestDay > FREE_DAILY))
			continue;
		if (cost(t, emails) < cost(best, emails)) best = t;
	}
	return best;
}

// One row of https://resend.com/docs/api-reference/emails/get-metrics.md
// with dimensions period, domain and optionally broadcast. Field names from
// the response example and the SDK's EmailMetricsDataRow type
// (github.com/resend/resend-node, src/emails/interfaces/get-metrics.interface.ts).
export type ResendRow = {
	period?: string;
	domain_name?: string;
	broadcast_id?: string | null;
	received?: number;
};

// One line per month and sending domain. A domain carries its share of the
// month's emails times the plan fee plus overage. `since` is the first day
// the API actually returned (it clamps to the plan's retention), so a month
// cut short is skipped instead of overwriting a complete figure.
export function resendLines(
	all: ResendRow[],
	broadcasts: ResendRow[],
	plan: string | undefined,
	since: string,
): CostLine[] {
	// Broadcasts are billed by contacts on marketing plans, not by email.
	const daily = new Map<string, number>();
	const add = (r: ResendRow, sign: number) => {
		if (!r.period) return;
		const k = `${r.period.slice(0, 10)}|${r.domain_name ?? ""}`;
		daily.set(k, (daily.get(k) ?? 0) + sign * (r.received ?? 0));
	};
	for (const r of all) add(r, 1);
	for (const r of broadcasts) if (r.broadcast_id) add(r, -1);

	const months = new Map<
		string,
		{ domains: Map<string, number>; days: Map<string, number> }
	>();
	for (const [k, n] of daily) {
		if (n <= 0) continue;
		const [day, domain] = k.split("|");
		const m = months.get(day.slice(0, 7)) ?? {
			domains: new Map(),
			days: new Map(),
		};
		m.domains.set(domain, (m.domains.get(domain) ?? 0) + n);
		m.days.set(day, (m.days.get(day) ?? 0) + n);
		months.set(day.slice(0, 7), m);
	}
	// A chosen plan charges its fee in months with no email too.
	if (plan) {
		for (
			let d = new Date(`${since.slice(0, 7)}-01T00:00:00Z`);
			d.getTime() <= Date.now();
			d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
		) {
			const month = d.toISOString().slice(0, 7);
			if (!months.has(month))
				months.set(month, { domains: new Map(), days: new Map() });
		}
	}

	const out: CostLine[] = [];
	for (const [month, m] of months) {
		if (`${month}-01` < since.slice(0, 10)) continue;
		const emails = [...m.domains.values()].reduce((a, b) => a + b, 0);
		const tier =
			(plan && RESEND_TIERS[plan]) ||
			cheapestTier(emails, Math.max(0, ...m.days.values()));
		const total = cost(tier, emails);
		if (!total) continue;
		// Emails with no domain, and the fee of an empty month, go to the
		// connection. That line drops to zero once domains have email.
		if (!emails) m.domains.set("", 1);
		else if (!m.domains.has("")) m.domains.set("", 0);
		const names = [...m.domains.keys()];
		const parts = splitCents(total, [...m.domains.values()]);
		names.forEach((name, i) => {
			out.push({
				externalId: `${month}:${name || "none"}`,
				date: `${month}-01`,
				currency: "USD",
				amountCents: parts[i],
				service: "Emails",
				subUnitId: name || undefined,
				subUnitLabel: name || undefined,
			});
		});
	}
	return out;
}

type Metrics = { start_date: string; data?: ResendRow[] };

export const resend = register({
	id: "resend",
	name: "Resend",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{ name: "key", label: "API key", placeholder: "re_…", secret: true },
			{
				name: "plan",
				label: "Plan",
				optional: true,
				options: [
					{ value: "", label: "Detect automatically" },
					...Object.entries(RESEND_TIERS).map(([value, t]) => ({
						value,
						label: t.label,
					})),
				],
			},
		],
		createUrl: "https://resend.com/api-keys",
		scopes: ["Permission: Full access. Sending access can't read metrics."],
	},
	async verify(c) {
		// https://resend.com/docs/api-reference/domains/list-domains.md (read 2026-10-06)
		const r = await getJson<{ data: { name: string }[] }>(
			`${API}/domains?limit=1`,
			{ headers: headers(c) },
		);
		return { label: r.data[0]?.name ?? "Resend" };
	},
	async fetchCosts(c, range) {
		// Whole months, so the first month's line is never partial.
		const start = `${range.from.slice(0, 7)}-01`;
		// https://resend.com/docs/api-reference/emails/get-metrics.md (read
		// 2026-10-06). Cached up to 15 minutes; start_date clamps to the plan's
		// retention.
		const q = (dimensions: string) =>
			getJson<Metrics>(
				`${API}/emails/metrics?start_date=${start}&granularity=daily&metrics=received&dimensions=${dimensions}`,
				{ headers: headers(c) },
			);
		const all = await q("period,domain");
		const broadcasts = await q("period,domain,broadcast");
		return resendLines(
			all.data ?? [],
			broadcasts.data ?? [],
			c.plan || undefined,
			all.start_date,
		);
	},
});
