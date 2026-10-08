import { register } from "./registry";
import {
	ConnectorError,
	type Credentials,
	getJson,
	type RevenueLine,
	type Snapshot,
	type SyncRange,
} from "./types";

const BASE = "https://api.polar.sh/v1";
// Every request names the API version, as Polar recommends, so response
// shapes don't change with its quarterly releases.
// https://polar.sh/docs/api-reference/2026-10/versioning
const headers = (c: Credentials) => ({
	Authorization: `Bearer ${c.token}`,
	"Polar-Version": "2026-10",
});
const day = (iso: string) => iso.slice(0, 10);
const shift = (d: string, days: number) =>
	new Date(Date.parse(`${d}T00:00:00Z`) + days * 86_400_000)
		.toISOString()
		.slice(0, 10);

type Interval = "day" | "week" | "month" | "year";

// https://polar.sh/docs/api-reference/2026-10/orders/list-orders
export type PolarOrder = {
	id: string;
	created_at: string;
	paid: boolean;
	// After discounts, before tax.
	net_amount: number;
	tax_amount: number;
	currency: string;
	billing_reason:
		| "purchase"
		| "subscription_create"
		| "subscription_cycle"
		| "subscription_update"
		| "subscription_meter_cycle";
	platform_fee_amount: number;
	// The organization's settlement currency, which can differ from the
	// order's.
	platform_fee_currency: string | null;
	subscription: {
		recurring_interval: Interval;
		recurring_interval_count: number;
	} | null;
};

// https://polar.sh/docs/api-reference/2026-10/refunds/list-refunds
export type PolarRefund = {
	id: string;
	created_at: string;
	// Before tax.
	amount: number;
	tax_amount: number;
	currency: string;
	subscription_id: string | null;
};

type Page<T> = { items: T[]; pagination: { max_page: number } };

async function* list<T>(c: Credentials, path: string) {
	for (let page = 1; ; page++) {
		const r = await getJson<Page<T>>(`${BASE}${path}&limit=100&page=${page}`, {
			headers: headers(c),
		});
		yield* r.items;
		if (page >= r.pagination.max_page) return;
	}
}

// `n` intervals after a day. A day past the end of a shorter month moves to
// its last day: January 31 plus a month is February 28.
export function addInterval(d: string, unit: Interval, n: number) {
	const [y, m, dd] = d.split("-").map(Number);
	if (unit === "day" || unit === "week")
		return shift(d, n * (unit === "week" ? 7 : 1));
	const month = m - 1 + n * (unit === "year" ? 12 : 1);
	const last = new Date(Date.UTC(y, month + 1, 0)).getUTCDate();
	return new Date(Date.UTC(y, month, Math.min(dd, last)))
		.toISOString()
		.slice(0, 10);
}

// One line per paid order, dated when it was created. A renewal's order is
// created when its period starts, even when a retry pays it later.
// https://polar.sh/docs/features/subscriptions/failed-payments
// Gross is the price after discounts and before tax, and Polar's fee is
// the payment fee. Polar files the tax as merchant of record; it is
// reported as taxCents. A fee in another currency than the order's
// becomes a line of its own.
// https://polar.sh/docs/merchant-of-record/fees
// A new subscription or a renewal pays for one interval from the order's
// date. Polar reports only the subscription's current period, so the
// period is counted from the interval. Plan changes and metered usage are
// earned on their date.
export function polarOrderLines(o: PolarOrder): RevenueLine[] {
	const fee = o.platform_fee_amount;
	if (!o.paid || (!o.net_amount && !fee)) return [];
	const currency = o.currency.toUpperCase();
	const feeCurrency = o.platform_fee_currency?.toUpperCase() ?? currency;
	const feeHere = feeCurrency === currency ? fee : 0;
	const date = day(o.created_at);
	const s = o.subscription;
	const kind = s ? "subscription" : "one_time";
	const period =
		s &&
		(o.billing_reason === "subscription_create" ||
			o.billing_reason === "subscription_cycle")
			? {
					serviceStart: date,
					serviceEnd: addInterval(
						date,
						s.recurring_interval,
						s.recurring_interval_count,
					),
				}
			: {};
	const out: RevenueLine[] = [
		{
			externalId: `order:${o.id}`,
			date,
			currency,
			grossCents: o.net_amount,
			feesCents: feeHere,
			refundsCents: 0,
			netCents: o.net_amount - feeHere,
			taxCents: o.tax_amount,
			kind,
			...period,
		},
	];
	if (fee && !feeHere)
		out.push({
			externalId: `order:${o.id}:fee`,
			date,
			currency: feeCurrency,
			grossCents: 0,
			feesCents: fee,
			refundsCents: 0,
			netCents: -fee,
			kind,
		});
	return out;
}

// A refund, dated when it was made. Polar keeps its fee on refunds.
// https://polar.sh/docs/features/refunds
export function polarRefundLine(r: PolarRefund): RevenueLine {
	return {
		externalId: `refund:${r.id}`,
		date: day(r.created_at),
		currency: r.currency.toUpperCase(),
		grossCents: 0,
		feesCents: 0,
		refundsCents: r.amount,
		netCents: -r.amount,
		taxCents: -r.tax_amount,
		kind: r.subscription_id ? "subscription" : "one_time",
	};
}

async function orderLines(c: Credentials, range: SyncRange) {
	const out: RevenueLine[] = [];
	// A failed renewal is retried for up to 21 days and its order keeps the
	// day it was created, so orders are reread that far back.
	for await (const o of list<PolarOrder>(
		c,
		`/orders/?created_after=${shift(range.from, -21)}T00:00:00Z&created_before=${shift(range.to, 1)}T00:00:00Z&sorting=created_at`,
	))
		out.push(...polarOrderLines(o));
	// Refunds can't be filtered by date; newest first, the walk stops at
	// the first one before the range.
	for await (const r of list<PolarRefund>(
		c,
		"/refunds/?succeeded=true&sorting=-created_at",
	)) {
		if (day(r.created_at) < range.from) break;
		out.push(polarRefundLine(r));
	}
	return out;
}

type Period = {
	timestamp: string;
	revenue: number | null;
	net_revenue: number | null;
	monthly_recurring_revenue: number | null;
	active_subscriptions: number | null;
};
type Metrics = { periods: Period[] };

// Polar's metrics report in cents with no currency field; organizations
// bill in USD unless configured otherwise.
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

// One line per day from the metrics endpoint: gross and net, so Polar's
// fee is the difference. Both exclude tax, and the metrics don't report
// it, so taxCents stays 0.
// https://polar.sh/docs/features/analytics
async function dailyLines(c: Credentials, range: SyncRange) {
	// Polar caps day-interval queries at 366 days.
	const periods: Period[] = [];
	let from = range.from;
	while (from <= range.to) {
		const chunkEnd = new Date(
			Math.min(
				Date.parse(`${from}T00:00:00Z`) + 365 * 86_400_000,
				Date.parse(`${range.to}T00:00:00Z`),
			),
		)
			.toISOString()
			.slice(0, 10);
		periods.push(...(await metrics(c, from, chunkEnd, "day")).periods);
		from = shift(chunkEnd, 1);
	}
	const out: RevenueLine[] = [];
	for (const p of periods) {
		const gross = p.revenue ?? 0;
		const net = p.net_revenue ?? gross;
		if (!gross && !net) continue;
		out.push({
			externalId: `day:${day(p.timestamp)}`,
			date: day(p.timestamp),
			currency: CURRENCY,
			grossCents: gross,
			feesCents: gross - net,
			refundsCents: 0,
			netCents: net,
			kind: "subscription",
		});
	}
	return out;
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
		scopes: [
			"organizations:read",
			"metrics:read",
			"orders:read",
			"refunds:read",
		],
	},
	// Polar is the merchant of record and files the tax it collects.
	// https://polar.sh/docs/merchant-of-record/introduction
	remitsTax: true,
	// Daily totals from the metrics, before orders.
	// ponytail: a token without the order scopes keeps writing them, so each
	// of its syncs reads the whole history (two or three metrics requests);
	// read only the range if that ever matters.
	legacyIds: "day:",
	async verify(c) {
		const r = await getJson<{ items: { name: string }[] }>(
			`${BASE}/organizations/?limit=1`,
			{ headers: headers(c) },
		);
		return { label: r.items[0]?.name ?? "Polar" };
	},
	// Orders and refunds. A token made before OpenProfit read them lacks
	// `orders:read` or `refunds:read` (Polar answers 403) and keeps the
	// daily totals from the metrics.
	async fetchRevenue(c, range: SyncRange) {
		try {
			return await orderLines(c, range);
		} catch (err) {
			if (err instanceof ConnectorError && err.status === 403)
				return dailyLines(c, range);
			throw err;
		}
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
