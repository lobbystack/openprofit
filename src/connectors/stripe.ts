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
// Pinned to the last version whose invoices carry `charge` and `tax`, and
// whose charges carry `invoice`; 2025-03-31.basil removed them.
// https://docs.stripe.com/changelog/basil/2025-03-31/add-support-for-multiple-partial-payments-on-invoices
const VERSION = "2025-02-24.acacia";
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
	// Expanded: a charge carries its invoice, a refund or dispute its charge.
	source: {
		id: string;
		object: string;
		invoice?: string | null;
		charge?: string | null;
	} | null;
};
// https://docs.stripe.com/api/invoices/object
type Invoice = { charge: string | null; tax: number | null; total: number };
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

// Balance transactions include tax in `amount`. A charge's tax comes from
// its invoice, as the invoice's share of tax; a refund or dispute returns
// tax in the same share. Charges without an invoice (one-off Checkout and
// Payment Links payments) count no tax.
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

const taxShare = (i: Invoice | null) =>
	i && i.total > 0 && i.tax ? i.tax / i.total : 0;

// Tax share by charge id: invoices from 60 days before the range in one
// list, charges without an invoice from the transactions, and a charge
// lookup for the rest (a refund of an older charge). A key without
// Invoices: read counts no tax.
async function taxShares(c: Credentials, range: SyncRange, txns: StripeTxn[]) {
	const shares = new Map<string, number>();
	for (const t of txns)
		if (t.source?.object === "charge" && !t.source.invoice)
			shares.set(t.source.id, 0);
	let canRead = true;
	const denied = (err: unknown) => {
		if (!(err instanceof ConnectorError && err.status === 403)) throw err;
		canRead = false;
	};
	try {
		// https://docs.stripe.com/api/invoices/list
		for await (const i of paginate<Invoice & { id: string }>(
			`${BASE}/v1/invoices?created[gte]=${unix(range.from) - 60 * 86_400}`,
			c,
		))
			if (i.charge) shares.set(i.charge, taxShare(i));
	} catch (err) {
		denied(err);
	}
	return async (charge: string) => {
		let share = shares.get(charge);
		if (share !== undefined || !canRead) return share ?? 0;
		try {
			// https://docs.stripe.com/api/charges/retrieve
			const ch = await getJson<{ invoice: Invoice | null }>(
				`${BASE}/v1/charges/${charge}?expand[]=invoice`,
				{ headers: headers(c) },
			);
			share = taxShare(ch.invoice);
		} catch (err) {
			denied(err);
			share = 0;
		}
		shares.set(charge, share);
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
		const tax = await taxShares(c, range, txns);
		const out: RevenueLine[] = [];
		for (const t of txns) {
			const refund = t.type.includes("refund") || t.type === "dispute";
			const charge =
				t.source?.object === "charge" ? t.source.id : t.source?.charge;
			const share =
				charge && (refund || t.source?.object === "charge")
					? await tax(charge)
					: 0;
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
