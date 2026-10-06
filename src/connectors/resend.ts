import { register } from "./registry";
import {
	ConnectorError,
	type CostLine,
	type Credentials,
	getJson,
	splitByUsage,
} from "./types";

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
const overage = (t: (typeof RESEND_TIERS)[string], emails: number) =>
	Math.round((Math.max(0, emails - t.emails) * t.per1k) / 1000);

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

const DAY = 86_400_000;
const daysIn = (day: string) =>
	new Date(
		Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0),
	).getUTCDate();

// One line per day and sending domain. Each day carries its share of the
// month's plan fee, plus the overage its emails add once the month is past
// the plan's volume, split across domains by that day's emails. A day with
// no email puts its fee share on the connection. Days stand alone, so a
// month that falls partly out of Resend's retention never freezes half
// counted: its older days keep the lines they were given.
// ponytail: when a month's first days fall out of the window, its later
// days are repriced without them, which undercounts overage only in a month
// that went over the plan's volume.
export function resendLines(
	all: ResendRow[],
	broadcasts: ResendRow[],
	plan: (typeof RESEND_TIERS)[string],
	since: string,
	today: string,
): CostLine[] {
	// Broadcasts are billed by contacts on marketing plans, not by email.
	const daily = new Map<string, Map<string, number>>();
	const add = (r: ResendRow, sign: number) => {
		if (!r.period) return;
		const day = r.period.slice(0, 10);
		const domains = daily.get(day) ?? new Map<string, number>();
		const name = r.domain_name ?? "";
		domains.set(name, (domains.get(name) ?? 0) + sign * (r.received ?? 0));
		daily.set(day, domains);
	};
	for (const r of all) add(r, 1);
	for (const r of broadcasts) if (r.broadcast_id) add(r, -1);

	const out: CostLine[] = [];
	let month = "";
	let sent = 0;
	for (
		let t = Date.parse(`${since.slice(0, 10)}T00:00:00Z`);
		t <= Date.parse(`${today}T00:00:00Z`);
		t += DAY
	) {
		const day = new Date(t).toISOString().slice(0, 10);
		if (day.slice(0, 7) !== month) {
			month = day.slice(0, 7);
			sent = 0;
		}
		const domains = daily.get(day) ?? new Map<string, number>();
		const emails = [...domains.values()].reduce(
			(a, n) => a + Math.max(0, n),
			0,
		);
		const n = daysIn(day);
		const fee =
			Math.floor(plan.fee / n) +
			(Number(day.slice(8, 10)) <= plan.fee % n ? 1 : 0);
		const cents = fee + overage(plan, sent + emails) - overage(plan, sent);
		sent += emails;
		for (const [name, part] of splitByUsage(cents, domains))
			out.push({
				externalId: `${day}:${name || "none"}`,
				date: day,
				currency: "USD",
				amountCents: part,
				service: "Emails",
				subUnitId: name || undefined,
				subUnitLabel: name || undefined,
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
				options: [
					{ value: "", label: "Pick your plan" },
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
	// Resend keeps 30 days; lines inside the last 28 are always returned.
	historyDays: 28,
	async fetchCosts(c, range) {
		const plan = RESEND_TIERS[c.plan];
		if (!plan)
			throw new ConnectorError(
				"Pick your Resend plan on the connection. OpenProfit prices emails by it.",
			);
		// From the month's start, so overage counts the whole month.
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
			plan,
			all.start_date > start ? all.start_date : start,
			range.to,
		);
	},
});
