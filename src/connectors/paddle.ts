import { register } from "./registry";
import {
	type Credentials,
	getJson,
	type RevenueLine,
	type Snapshot,
	type SyncRange,
	splitCents,
} from "./types";

// Paddle Billing. Sandbox keys contain `_sdbx_` and talk to the sandbox API.
const base = (c: Credentials) =>
	c.key.includes("_sdbx_")
		? "https://sandbox-api.paddle.com"
		: "https://api.paddle.com";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.key}` });
const day = (iso: string) => iso.slice(0, 10);
const shift = (d: string, days: number) =>
	new Date(Date.parse(`${d}T00:00:00Z`) + days * 86_400_000)
		.toISOString()
		.slice(0, 10);
// Amounts are strings in the currency's lowest denomination.
const int = (s: string | null | undefined) => Number(s ?? 0);

type Page<T> = {
	data: T[];
	meta: { pagination: { next: string; has_more: boolean } };
};

export type PaddleTxn = {
	id: string;
	status: string;
	currency_code: string;
	subscription_id: string | null;
	billed_at: string | null;
	// Set on subscription transactions: the period they pay for.
	// https://developer.paddle.com/api-reference/transactions/get-transaction
	billing_period: { starts_at: string; ends_at: string } | null;
	items: { id: string; price: { product_id: string } }[];
	details: {
		totals: { tax: string; total: string; fee: string | null };
		line_items: {
			totals: { tax: string; total: string };
			product: { id: string; name: string };
		}[];
	};
};

export type PaddleAdjustment = {
	id: string;
	action: string;
	status: string;
	transaction_id: string;
	subscription_id: string | null;
	currency_code: string;
	created_at: string;
	items: { item_id: string; totals?: { subtotal: string; tax: string } }[];
	totals: {
		subtotal: string;
		tax: string;
		fee: string;
		retained_fee?: string | null;
	};
};

// Every page of a list. `next` carries the original query, so it is fetched
// as is (https://developer.paddle.com/api-reference/about/pagination).
async function* list<T>(c: Credentials, path: string) {
	let url: string | null = `${base(c)}${path}`;
	while (url) {
		const page: Page<T> = await getJson<Page<T>>(url, { headers: headers(c) });
		yield* page.data;
		url = page.meta.pagination.has_more ? page.meta.pagination.next : null;
	}
}

// One line per product in a completed transaction. Revenue excludes tax,
// which Paddle collects and remits as merchant of record; it is reported as
// taxCents. Paddle reports
// one fee per transaction; it is split across products by revenue. Free
// trial transactions total zero and are skipped. A period ends on the
// instant the next one starts, so its day is the exclusive end.
export function paddleTxnLines(t: PaddleTxn): RevenueLine[] {
	const lines = t.details.line_items.map((li) => ({
		gross: int(li.totals.total) - int(li.totals.tax),
		tax: int(li.totals.tax),
		product: li.product,
	}));
	const gross = lines.reduce((s, l) => s + l.gross, 0);
	const fee = int(t.details.totals.fee);
	if (!gross && !fee) return [];
	let feeLeft = fee;
	return lines.map((l, i) => {
		const f =
			i === lines.length - 1
				? feeLeft
				: gross
					? Math.round((fee * l.gross) / gross)
					: 0;
		feeLeft -= f;
		return {
			externalId: `${t.id}:${i}`,
			date: day(t.billed_at ?? ""),
			currency: t.currency_code.toUpperCase(),
			grossCents: l.gross,
			feesCents: f,
			refundsCents: 0,
			netCents: l.gross - f,
			taxCents: l.tax,
			kind: t.subscription_id ? "subscription" : "one_time",
			serviceStart: t.billing_period
				? day(t.billing_period.starts_at)
				: undefined,
			serviceEnd: t.billing_period ? day(t.billing_period.ends_at) : undefined,
			subUnitId: l.product.id,
			subUnitLabel: l.product.name,
		};
	});
}

// Refunds, credits and chargebacks take back the amount before tax, and
// the tax returned shows as negative taxCents. Paddle
// returns its fee on the adjustment except `retained_fee`. An adjustment
// over items of several products becomes one line per product, split by
// each item's amount; the fee follows the same split.
export function paddleAdjustmentLines(
	a: PaddleAdjustment,
	productOf: (itemId: string) => { id: string; name: string } | undefined,
): RevenueLine[] {
	const groups = new Map<
		string,
		{ product?: { id: string; name: string }; amount: number; tax: number }
	>();
	for (const it of a.items) {
		const product = productOf(it.item_id);
		const key = product?.id ?? "";
		const g = groups.get(key) ?? { product, amount: 0, tax: 0 };
		g.amount += int(it.totals?.subtotal);
		g.tax += int(it.totals?.tax);
		groups.set(key, g);
	}
	const parts = [...groups.values()];
	const total = int(a.totals.subtotal);
	const fee = int(a.totals.fee);
	const kept = int(a.totals.retained_fee);
	const tax = int(a.totals.tax);
	// One product, or item amounts that don't add up to the total: one line.
	if (parts.length <= 1 || parts.reduce((s, g) => s + g.amount, 0) !== total)
		return [adjustmentLine(a, a.id, total, fee, kept, tax, parts[0]?.product)];
	const weights = parts.map((g) => g.amount);
	const fees = splitCents(fee, weights);
	const keptParts = splitCents(kept, weights);
	// Item taxes that don't add up to the total follow the amount split.
	const taxes =
		parts.reduce((s, g) => s + g.tax, 0) === tax
			? parts.map((g) => g.tax)
			: splitCents(tax, weights);
	return parts.map((g, i) =>
		adjustmentLine(
			a,
			`${a.id}:${g.product?.id ?? "none"}`,
			g.amount,
			fees[i],
			keptParts[i],
			taxes[i],
			g.product,
		),
	);
}

function adjustmentLine(
	a: PaddleAdjustment,
	externalId: string,
	refund: number,
	fee: number,
	retained: number,
	tax: number,
	product?: { id: string; name: string },
): RevenueLine {
	return {
		externalId,
		date: day(a.created_at),
		currency: a.currency_code.toUpperCase(),
		grossCents: 0,
		feesCents: retained - fee,
		refundsCents: refund,
		netCents: fee - retained - refund,
		taxCents: -tax,
		kind: a.subscription_id ? "subscription" : "one_time",
		subUnitId: product?.id,
		subUnitLabel: product?.name,
	};
}

// Adjustments that take money back once approved. Reversals flip the
// original's status to `reversed`, so they are not counted separately.
const TAKES_BACK = new Set(["refund", "credit", "chargeback"]);

export const paddle = register({
	id: "paddle",
	name: "Paddle",
	kind: "revenue",
	auth: {
		kind: "key",
		fields: [
			{
				name: "key",
				label: "API key",
				placeholder: "pdl_live_apikey_…",
				secret: true,
			},
		],
		createUrl: "https://vendors.paddle.com/authentication-v2",
		scopes: ["transaction.read", "adjustment.read", "metrics.read"],
	},
	// https://www.paddle.com/legal/terms (Paddle is the merchant of record)
	remitsTax: true,
	// Paddle has no endpoint for the seller's name; a one-item list proves
	// the key and its transaction.read permission.
	// https://developer.paddle.com/api-reference/transactions/list-transactions
	async verify(c) {
		await getJson(`${base(c)}/transactions?per_page=1`, {
			headers: headers(c),
		});
		return {
			label: c.key.includes("_sdbx_") ? "Paddle sandbox" : "Paddle",
		};
	},
	async fetchRevenue(c, range: SyncRange) {
		const out: RevenueLine[] = [];
		const products = new Map<string, { id: string; name: string }>();
		const remember = (t: PaddleTxn) => {
			for (const it of t.items) {
				const li = t.details.line_items.find(
					(l) => l.product.id === it.price.product_id,
				);
				if (li) products.set(it.id, li.product);
			}
		};
		const to = `${shift(range.to, 1)}T00:00:00Z`;
		// Automatic payments complete within minutes of billing. Manual
		// invoices are billed when issued and paid later, so they are reread
		// further back.
		// https://developer.paddle.com/api-reference/transactions/list-transactions
		for (const [mode, from] of [
			["automatic", range.from],
			["manual", shift(range.from, -90)],
		]) {
			for await (const t of list<PaddleTxn>(
				c,
				`/transactions?status=completed&collection_mode=${mode}&billed_at[GTE]=${from}T00:00:00Z&billed_at[LT]=${to}&per_page=30`,
			)) {
				remember(t);
				out.push(...paddleTxnLines(t));
			}
		}
		// Adjustments can't be filtered by date. They list newest first, so
		// stop at the first one older than the range. Approval can take a few
		// days, so the window starts two weeks early.
		// https://developer.paddle.com/api-reference/adjustments/list-adjustments
		const since = shift(range.from, -14);
		for await (const a of list<PaddleAdjustment>(
			c,
			"/adjustments?status=approved&per_page=50",
		)) {
			if (day(a.created_at) < since) break;
			if (!TAKES_BACK.has(a.action)) continue;
			if (a.items.some((it) => !products.has(it.item_id))) {
				// https://developer.paddle.com/api-reference/transactions/get-transaction
				const r = await getJson<{ data: PaddleTxn }>(
					`${base(c)}/transactions/${a.transaction_id}`,
					{ headers: headers(c) },
				);
				remember(r.data);
			}
			out.push(...paddleAdjustmentLines(a, (id) => products.get(id)));
		}
		return out;
	},
	// Daily MRR and paying subscribers in the account's balance currency.
	// https://developer.paddle.com/api-reference/metrics/get-metrics-monthly-recurring-revenue
	// https://developer.paddle.com/api-reference/metrics/get-metrics-active-subscribers
	async fetchSnapshots(c, date): Promise<Snapshot[]> {
		const q = `from=${shift(date, -7)}&to=${shift(date, 1)}`;
		const [mrr, subs] = await Promise.all([
			getJson<{
				data: {
					currency_code: string;
					timeseries: { amount: string }[];
				};
			}>(`${base(c)}/metrics/monthly-recurring-revenue?${q}`, {
				headers: headers(c),
			}),
			getJson<{ data: { timeseries: { count: number }[] } }>(
				`${base(c)}/metrics/active-subscribers?${q}`,
				{ headers: headers(c) },
			),
		]);
		const lastMrr = mrr.data.timeseries.at(-1);
		const lastSubs = subs.data.timeseries.at(-1);
		const out: Snapshot[] = [];
		if (lastMrr)
			out.push({
				date,
				metric: "mrr_base_cents",
				value: int(lastMrr.amount),
				currency: mrr.data.currency_code.toUpperCase(),
			});
		if (lastSubs)
			out.push({ date, metric: "customers", value: lastSubs.count });
		return out;
	},
});
