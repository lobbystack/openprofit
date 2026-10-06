import { register } from "./registry";
import {
	type Credentials,
	getJson,
	mrrSnapshots,
	type RevenueLine,
	type Snapshot,
	type SyncRange,
} from "./types";

// JSON:API over https://api.lemonsqueezy.com/v1. Amounts are integer cents.
// https://docs.lemonsqueezy.com/api/getting-started/requests
const BASE = "https://api.lemonsqueezy.com/v1";
const headers = (c: Credentials) => ({
	Accept: "application/vnd.api+json",
	Authorization: `Bearer ${c.key}`,
});
const shift = (d: string, days: number) =>
	new Date(Date.parse(`${d}T00:00:00Z`) + days * 86_400_000)
		.toISOString()
		.slice(0, 10);

type Resource<A> = { id: string; attributes: A };
type Page<A> = {
	data: Resource<A>[];
	meta: { page: { currentPage: number; lastPage: number } };
};

// Orders and subscription invoices share these fields.
export type LsSale = {
	currency: string;
	tax: number;
	total: number;
	refunded_amount: number;
	refunded_at: string | null;
	status: string;
	created_at: string;
	updated_at: string;
};
export type LsOrder = LsSale & {
	first_order_item: { product_id: number; product_name: string };
};
export type LsInvoice = LsSale & {
	subscription_id: number;
	billing_reason: "initial" | "renewal" | "updated";
};
type LsSubscription = {
	store_id: number;
	order_id: number;
	product_id: number;
	product_name: string;
	status: string;
	first_subscription_item: { price_id: number; quantity: number } | null;
};
type LsPrice = {
	scheme: string;
	unit_price: number | null;
	renewal_interval_unit: "day" | "week" | "month" | "year" | null;
	renewal_interval_quantity: number | null;
};

// Every page, newest first. `stop` ends the walk early once results are
// older than needed.
async function* list<A>(
	c: Credentials,
	path: string,
	stop: (a: A) => boolean = () => false,
) {
	for (let n = 1; ; n++) {
		const sep = path.includes("?") ? "&" : "?";
		const page = await getJson<Page<A>>(
			`${BASE}${path}${sep}page[size]=100&page[number]=${n}`,
			{ headers: headers(c) },
		);
		for (const r of page.data) {
			if (stop(r.attributes)) return;
			yield r;
		}
		if (n >= page.meta.page.lastPage) return;
	}
}

// A sale and, once money went back, a refund dated when it happened.
// Revenue excludes tax, which Lemon Squeezy collects and remits as merchant
// of record; a refund removes tax in the same proportion. The API reports
// no fees, so net equals revenue.
export function lsLines(
	id: string,
	s: LsSale,
	kind: RevenueLine["kind"],
	product?: { id: number; name: string },
): RevenueLine[] {
	if (!["paid", "refunded", "partial_refund"].includes(s.status)) return [];
	const gross = s.total - s.tax;
	const base = {
		currency: s.currency.toUpperCase(),
		feesCents: 0,
		kind,
		subUnitId: product ? String(product.id) : undefined,
		subUnitLabel: product?.name,
	};
	const out: RevenueLine[] = [];
	if (gross)
		out.push({
			...base,
			externalId: id,
			date: s.created_at.slice(0, 10),
			grossCents: gross,
			refundsCents: 0,
			netCents: gross,
		});
	if (s.refunded_amount > 0 && s.total > 0) {
		const refund = Math.round((s.refunded_amount * gross) / s.total);
		out.push({
			...base,
			externalId: `${id}:refund`,
			date: (s.refunded_at ?? s.updated_at).slice(0, 10),
			grossCents: 0,
			refundsCents: refund,
			netCents: -refund,
		});
	}
	return out;
}

const PER_MONTH = { day: 365 / 12, week: 52 / 12, month: 1, year: 1 / 12 };

// Every subscription, read once per sync: revenue and snapshots get the
// same credentials object, so the walk is shared through it.
// https://docs.lemonsqueezy.com/api/subscriptions/list-all-subscriptions
const subsOf = new WeakMap<Credentials, Promise<Resource<LsSubscription>[]>>();
function subscriptions(c: Credentials) {
	let p = subsOf.get(c);
	if (!p) {
		p = (async () => {
			const all: Resource<LsSubscription>[] = [];
			for await (const s of list<LsSubscription>(c, "/subscriptions"))
				all.push(s);
			return all;
		})();
		subsOf.set(c, p);
	}
	return p;
}

// Refunds only show on the original order or invoice, and neither can be
// filtered by date. A regular sync rereads 30 days before the range; the
// first successful sync of each UTC day per key rereads 180, for later
// refunds. Kept in memory; a restart rereads 180 once more.
const deepReadOn = new Map<string, string>();
const keyId = async (c: Credentials) =>
	Buffer.from(
		await crypto.subtle.digest("SHA-256", new TextEncoder().encode(c.key)),
	).toString("hex");
const today = () => new Date().toISOString().slice(0, 10);

export const lemonsqueezy = register({
	id: "lemonsqueezy",
	name: "Lemon Squeezy",
	kind: "revenue",
	auth: {
		kind: "key",
		fields: [{ name: "key", label: "API key", secret: true }],
		createUrl: "https://app.lemonsqueezy.com/settings/api",
		scopes: ["Full access (Lemon Squeezy keys have no scopes)"],
	},
	// https://docs.lemonsqueezy.com/api/stores/list-all-stores
	async verify(c) {
		const r = await getJson<{ data: Resource<{ name: string }>[] }>(
			`${BASE}/stores`,
			{ headers: headers(c) },
		);
		return {
			label: r.data.map((s) => s.attributes.name).join(", ") || "Lemon Squeezy",
		};
	},
	// Refund lines on orders older than the reread window aren't returned,
	// so a fetch never proves a line is gone.
	historyDays: 0,
	async fetchRevenue(c, range: SyncRange) {
		// Subscriptions give renewals their product and tell subscription
		// orders from one-time ones.
		const subs = new Map<string, LsSubscription>();
		const subOrders = new Set<number>();
		for (const s of await subscriptions(c)) {
			subs.set(s.id, s.attributes);
			subOrders.add(s.attributes.order_id);
		}
		const id = await keyId(c);
		const deep = deepReadOn.get(id) !== today();
		const since = shift(range.from, deep ? -180 : -30);
		const older = (a: LsSale) => a.created_at.slice(0, 10) < since;
		const out: RevenueLine[] = [];
		// An order can hold several items, but the order list only carries
		// the first; the whole order goes to that item's product.
		// ponytail: per-item amounts need a request per order (order-items).
		// https://docs.lemonsqueezy.com/api/orders/list-all-orders
		for await (const o of list<LsOrder>(c, "/orders", older)) {
			const item = o.attributes.first_order_item;
			out.push(
				...lsLines(
					`order:${o.id}`,
					o.attributes,
					subOrders.has(Number(o.id)) ? "subscription" : "one_time",
					{ id: item.product_id, name: item.product_name },
				),
			);
		}
		// The first payment of a subscription is also an order, so only
		// renewals and plan changes come from invoices.
		// https://docs.lemonsqueezy.com/api/subscription-invoices/list-all-subscription-invoices
		for await (const inv of list<LsInvoice>(
			c,
			"/subscription-invoices",
			older,
		)) {
			if (inv.attributes.billing_reason === "initial") continue;
			const s = subs.get(String(inv.attributes.subscription_id));
			out.push(
				...lsLines(
					`invoice:${inv.id}`,
					inv.attributes,
					"subscription",
					s && { id: s.product_id, name: s.product_name },
				),
			);
		}
		if (deep) deepReadOn.set(id, today());
		return out;
	},
	// MRR from active subscriptions at their price, in the store's currency.
	// Tiered and usage-based prices have no fixed amount and are left out.
	async fetchSnapshots(c, date): Promise<Snapshot[]> {
		// https://docs.lemonsqueezy.com/api/stores/list-all-stores
		const stores = await getJson<{ data: Resource<{ currency: string }>[] }>(
			`${BASE}/stores`,
			{ headers: headers(c) },
		);
		const currencyOf = new Map(
			stores.data.map((s) => [Number(s.id), s.attributes.currency]),
		);
		const prices = new Map<number, LsPrice>();
		const byCurrency = new Map<string, number>();
		let customers = 0;
		for (const { attributes: s } of await subscriptions(c)) {
			if (s.status !== "active") continue;
			customers++;
			const item = s.first_subscription_item;
			if (!item) continue;
			let p = prices.get(item.price_id);
			if (!p) {
				// https://docs.lemonsqueezy.com/api/prices/retrieve-price
				p = (
					await getJson<{ data: Resource<LsPrice> }>(
						`${BASE}/prices/${item.price_id}`,
						{ headers: headers(c) },
					)
				).data.attributes;
				prices.set(item.price_id, p);
			}
			const unit = p.renewal_interval_unit;
			if (p.scheme !== "standard" || p.unit_price == null || !unit) continue;
			const monthly =
				(p.unit_price * item.quantity * PER_MONTH[unit]) /
				(p.renewal_interval_quantity || 1);
			const cur = (currencyOf.get(s.store_id) ?? "USD").toUpperCase();
			byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + monthly);
		}
		return mrrSnapshots(date, byCurrency, customers);
	},
});
