import { register } from "./registry";
import {
	ConnectorError,
	type Credentials,
	dayOf,
	getJson,
	mrrSnapshots,
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
	invoice: { total: number; total_taxes: { amount: number }[] | null };
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

// Balance transactions include tax in `amount`. The tax share comes from
// the payment's invoice or Checkout Session; a refund or dispute returns
// tax in the same share. Payments with neither, such as direct
// PaymentIntents, count no tax.
export function stripeLine(
	t: StripeTxn,
	refund: boolean,
	share: number,
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
	};
}

const invoiceShare = (i: InvoicePayment["invoice"]) =>
	i.total > 0
		? (i.total_taxes ?? []).reduce((a, t) => a + t.amount, 0) / i.total
		: 0;
const sessionShare = (s: Session) =>
	s.amount_total ? (s.total_details?.amount_tax ?? 0) / s.amount_total : 0;

// Tax share by payment intent, for one sync. Two lists cover the range:
// paid invoice payments and completed Checkout Sessions, from 3 days
// before it (a session lasts at most a day). A payment they miss is looked
// up on its own: an invoice paid long after it was issued, or a refund of
// an older payment. A key without Invoices or Checkout Sessions read access
// counts no tax from that source.
// ponytail: a payment with neither costs one lookup per sync while it is in
// the 3-day reread; cache "no tax" across syncs if that shows in rate limits.
async function taxShares(c: Credentials, range: SyncRange) {
	const shares = new Map<string, number>();
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
				shares.set(p.payment.payment_intent, invoiceShare(p.invoice));
	});
	// https://docs.stripe.com/api/checkout/sessions/list
	await read("checkout", async () => {
		for await (const s of paginate<Session>(
			`${BASE}/v1/checkout/sessions?status=complete&${created}`,
			c,
		))
			if (s.payment_intent) shares.set(s.payment_intent, sessionShare(s));
	});
	// `listed`: the payment falls inside the range, so the session list
	// already covered it.
	return async (pi: string, listed: boolean) => {
		let share = shares.get(pi);
		if (share !== undefined) return share;
		share = 0;
		let found = false;
		await read("invoices", async () => {
			const r = await getJson<List<InvoicePayment>>(
				`${BASE}/v1/invoice_payments?status=paid&payment[type]=payment_intent&payment[payment_intent]=${pi}&expand[]=data.invoice`,
				{ headers: headers(c) },
			);
			if (r.data[0]) {
				share = invoiceShare(r.data[0].invoice);
				found = true;
			}
		});
		if (!found && !listed)
			await read("checkout", async () => {
				const r = await getJson<List<Session>>(
					`${BASE}/v1/checkout/sessions?payment_intent=${pi}`,
					{ headers: headers(c) },
				);
				if (r.data[0]) share = sessionShare(r.data[0]);
			});
		shares.set(pi, share);
		return share;
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
			const share = pi && (refund || charge) ? await tax(pi, charge) : 0;
			out.push(stripeLine(t, refund, share));
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
