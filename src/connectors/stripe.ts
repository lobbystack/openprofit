import { register } from "./registry";
import {
	ConnectorError,
	type Credentials,
	dayOf,
	getJson,
	mrrSnapshots,
	type Payout,
	type RevenueLine,
	type Snapshot,
	type SyncRange,
} from "./types";

const BASE = "https://api.stripe.com";
// Every request names the API version, as Stripe recommends, so response
// shapes don't follow the account's dashboard setting.
// https://docs.stripe.com/upgrades
const VERSION = "2026-09-30.endive";
const headers = (c: Credentials) => ({
	Authorization: `Bearer ${c.key}`,
	"Stripe-Version": VERSION,
});
const unix = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 1000);

export type StripeTxn = {
	id: string;
	amount: number;
	fee: number;
	net: number;
	currency: string;
	type: string;
	created: number;
	// Expanded. Charges, refunds and disputes carry their payment intent.
	source: {
		id: string;
		object: string;
		payment_intent?: string | null;
	} | null;
};
// https://docs.stripe.com/api/invoices/payments
type InvoicePayment = {
	id: string;
	payment: { payment_intent?: string };
	// Expanded. https://docs.stripe.com/api/invoices/object
	invoice: {
		total: number;
		total_taxes: { amount: number }[] | null;
		// https://docs.stripe.com/api/invoices/line_item
		lines: { data: { period: { start: number; end: number } }[] };
	};
};
// https://docs.stripe.com/api/checkout/sessions/object
type Session = {
	id: string;
	payment_intent: string | null;
	amount_total: number | null;
	total_details: { amount_tax: number } | null;
};
type List<T> = { data: T[]; has_more: boolean };

// Cash movements, not revenue.
const SKIP = new Set([
	"payout",
	"transfer",
	"payout_failure",
	"payout_cancel",
	// Money Stripe holds back from a payout and releases later: not revenue.
	// https://docs.stripe.com/api/balance_transactions/object#balance_transaction_object-type
	"payout_minimum_balance_hold",
	"payout_minimum_balance_release",
	"topup",
]);

async function* paginate<T extends { id: string }>(
	url: string,
	c: Credentials,
) {
	let after: string | undefined;
	for (;;) {
		const page = await getJson<List<T>>(
			`${url}&limit=100${after ? `&starting_after=${after}` : ""}`,
			{ headers: headers(c) },
		);
		for (const item of page.data) yield item;
		if (!page.has_more || page.data.length === 0) return;
		after = page.data[page.data.length - 1].id;
	}
}

type Sub = {
	id: string;
	currency: string;
	items: {
		data: {
			quantity: number;
			price: {
				unit_amount: number | null;
				recurring: {
					interval: "day" | "week" | "month" | "year";
					interval_count: number;
					usage_type: "licensed" | "metered";
				} | null;
			};
		}[];
		has_more: boolean;
	};
};

// What a payment's invoice or Checkout Session tells about it: the share
// of tax in its amount, and the period an invoice pays for.
type Paid = { share: number; serviceStart?: string; serviceEnd?: string };

// Balance transactions include tax in `amount`. The tax share comes from
// the payment's invoice or Checkout Session; a refund or dispute returns
// tax in the same share. Payments with neither, such as direct
// PaymentIntents, count no tax. A refund or dispute has no period.
export function stripeLine(
	t: StripeTxn,
	refund: boolean,
	{ share, serviceStart, serviceEnd }: Paid,
): RevenueLine {
	const tax = Math.round(t.amount * share);
	return {
		externalId: t.id,
		date: dayOf(t.created),
		currency: t.currency.toUpperCase(),
		grossCents: refund ? 0 : Math.max(t.amount - tax, 0),
		feesCents: t.fee,
		refundsCents: refund ? -(t.amount - tax) : 0,
		netCents: t.net - tax,
		taxCents: tax,
		kind: "other",
		...(refund ? {} : { serviceStart, serviceEnd }),
	};
}

// The invoice's period runs from its lines' earliest start to their latest
// end. A subscription line covers its billing period and a proration runs
// to the period's end; a one-off item is dated at one instant and covers
// none. Line periods end inclusive on the second the next period starts,
// so that day is the exclusive end.
// https://docs.stripe.com/api/invoices/line_item#invoice_line_item_object-period
export function invoicePaid(i: InvoicePayment["invoice"]): Paid {
	const share =
		i.total > 0
			? (i.total_taxes ?? []).reduce((a, t) => a + t.amount, 0) / i.total
			: 0;
	const periods = (i.lines?.data ?? [])
		.map((l) => l.period)
		.filter((p) => p && p.end > p.start);
	if (!periods.length) return { share };
	return {
		share,
		serviceStart: dayOf(Math.min(...periods.map((p) => p.start))),
		serviceEnd: dayOf(Math.max(...periods.map((p) => p.end))),
	};
}
const sessionPaid = (s: Session): Paid => ({
	share: s.amount_total
		? (s.total_details?.amount_tax ?? 0) / s.amount_total
		: 0,
});

// Tax share and period by payment intent, for one sync. Two lists cover
// the range: paid invoice payments and completed Checkout Sessions, from 3
// days before it (a session lasts at most a day). A payment they miss is
// looked up on its own: an invoice paid long after it was issued, or a
// refund of an older payment. A key without Invoices or Checkout Sessions
// read access counts no tax (and no period) from that source.
// ponytail: a payment with neither costs one lookup per sync while it is in
// the 3-day reread; cache "no tax" across syncs if that shows in rate limits.
async function taxShares(c: Credentials, range: SyncRange) {
	const shares = new Map<string, Paid>();
	const denied = new Set<string>();
	const read = async (source: string, f: () => Promise<void>) => {
		if (denied.has(source)) return;
		try {
			await f();
		} catch (err) {
			if (!(err instanceof ConnectorError && err.status === 403)) throw err;
			denied.add(source);
		}
	};
	const created = `created[gte]=${unix(range.from) - 3 * 86_400}&created[lt]=${unix(range.to) + 86_400}`;
	// https://docs.stripe.com/api/invoice-payment/list
	await read("invoices", async () => {
		for await (const p of paginate<InvoicePayment>(
			`${BASE}/v1/invoice_payments?status=paid&${created}&expand[]=data.invoice`,
			c,
		))
			if (p.payment.payment_intent)
				shares.set(p.payment.payment_intent, invoicePaid(p.invoice));
	});
	// https://docs.stripe.com/api/checkout/sessions/list
	await read("checkout", async () => {
		for await (const s of paginate<Session>(
			`${BASE}/v1/checkout/sessions?status=complete&${created}`,
			c,
		))
			if (s.payment_intent) shares.set(s.payment_intent, sessionPaid(s));
	});
	// `listed`: the payment falls inside the range, so the session list
	// already covered it.
	return async (pi: string, listed: boolean) => {
		let paid = shares.get(pi);
		if (paid) return paid;
		paid = { share: 0 };
		let found = false;
		await read("invoices", async () => {
			const r = await getJson<List<InvoicePayment>>(
				`${BASE}/v1/invoice_payments?status=paid&payment[type]=payment_intent&payment[payment_intent]=${pi}&expand[]=data.invoice`,
				{ headers: headers(c) },
			);
			if (r.data[0]) {
				paid = invoicePaid(r.data[0].invoice);
				found = true;
			}
		});
		if (!found && !listed)
			await read("checkout", async () => {
				const r = await getJson<List<Session>>(
					`${BASE}/v1/checkout/sessions?payment_intent=${pi}`,
					{ headers: headers(c) },
				);
				if (r.data[0]) paid = sessionPaid(r.data[0]);
			});
		shares.set(pi, paid);
		return paid;
	};
}

// https://docs.stripe.com/api/payouts/object
export type StripePayout = {
	id: string;
	amount: number;
	arrival_date: number;
	currency: string;
	status: "paid" | "pending" | "in_transit" | "canceled" | "failed";
};

// A payout that failed or was canceled never reached the bank. One still
// pending or in transit is dated when Stripe expects it to arrive.
export function stripePayout(p: StripePayout): Payout | null {
	if (p.status === "failed" || p.status === "canceled") return null;
	return {
		externalId: p.id,
		date: dayOf(p.arrival_date),
		currency: p.currency.toUpperCase(),
		amountCents: p.amount,
	};
}

const PER_MONTH = { day: 365 / 12, week: 52 / 12, month: 1, year: 1 / 12 };

export const stripe = register({
	id: "stripe",
	name: "Stripe",
	kind: "revenue",
	auth: {
		kind: "key",
		fields: [
			{
				name: "key",
				label: "Restricted key",
				placeholder: "rk_live_…",
				secret: true,
			},
		],
		createUrl: "https://dashboard.stripe.com/apikeys/create",
		scopes: [
			"Balance: read",
			"Balance transaction sources: read",
			"Charges: read",
			"Checkout Sessions: read",
			"Invoices: read",
			"Subscriptions: read",
		],
	},
	async verify(c) {
		const a = await getJson<{
			id: string;
			business_profile?: { name?: string | null };
			settings?: { dashboard?: { display_name?: string | null } };
		}>(`${BASE}/v1/account`, { headers: headers(c) });
		return {
			label:
				a.business_profile?.name ?? a.settings?.dashboard?.display_name ?? a.id,
		};
	},
	async fetchRevenue(c, range: SyncRange) {
		// https://docs.stripe.com/api/balance_transactions/list
		const txns: StripeTxn[] = [];
		for await (const t of paginate<StripeTxn>(
			`${BASE}/v1/balance_transactions?created[gte]=${unix(range.from)}&created[lt]=${unix(range.to) + 86_400}&expand[]=data.source`,
			c,
		))
			if (!SKIP.has(t.type)) txns.push(t);
		const tax = await taxShares(c, range);
		const out: RevenueLine[] = [];
		for (const t of txns) {
			const refund = t.type.includes("refund") || t.type === "dispute";
			const charge = t.source?.object === "charge";
			const pi = t.source?.payment_intent;
			out.push(
				stripeLine(
					t,
					refund,
					pi && (refund || charge) ? await tax(pi, charge) : { share: 0 },
				),
			);
		}
		return out;
	},
	// From the payout balance transactions, so the key needs no Payouts
	// access: the expanded source is the payout. Listed by creation, which
	// can come days before arrival, so the read starts 14 days early.
	// https://docs.stripe.com/api/balance_transactions/list
	async fetchPayouts(c, range: SyncRange) {
		const out: Payout[] = [];
		for await (const t of paginate<StripeTxn>(
			`${BASE}/v1/balance_transactions?type=payout&created[gte]=${unix(range.from) - 14 * 86_400}&created[lt]=${unix(range.to) + 86_400}&expand[]=data.source`,
			c,
		)) {
			if (t.source?.object !== "payout") continue;
			const p = stripePayout(t.source as unknown as StripePayout);
			if (p) out.push(p);
		}
		return out;
	},
	async fetchSnapshots(c, date): Promise<Snapshot[]> {
		const byCurrency = new Map<string, number>();
		let customers = 0;
		for await (const s of paginate<Sub>(
			`${BASE}/v1/subscriptions?status=active`,
			c,
		)) {
			customers++;
			for (const it of s.items.data) {
				const r = it.price.recurring;
				if (!r || r.usage_type === "metered" || it.price.unit_amount == null)
					continue;
				const monthly =
					(it.price.unit_amount * it.quantity * PER_MONTH[r.interval]) /
					r.interval_count;
				const cur = s.currency.toUpperCase();
				byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + monthly);
			}
		}
		// One snapshot per currency; sync converts and adds them up.
		return mrrSnapshots(date, byCurrency, customers);
	},
});
