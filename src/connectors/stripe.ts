import { register } from "./registry";
import {
	type Credentials,
	dayOf,
	getJson,
	mrrSnapshots,
	type RevenueLine,
	type Snapshot,
	type SyncRange,
} from "./types";

const BASE = "https://api.stripe.com";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.key}` });
const unix = (d: string) => Math.floor(Date.parse(`${d}T00:00:00Z`) / 1000);

type Txn = {
	id: string;
	amount: number;
	fee: number;
	net: number;
	currency: string;
	type: string;
	created: number;
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
		const out: RevenueLine[] = [];
		const url = `${BASE}/v1/balance_transactions?created[gte]=${unix(range.from)}&created[lt]=${unix(range.to) + 86_400}`;
		for await (const t of paginate<Txn>(url, c)) {
			if (SKIP.has(t.type)) continue;
			const refund = t.type.includes("refund") || t.type === "dispute";
			out.push({
				externalId: t.id,
				date: dayOf(t.created),
				currency: t.currency.toUpperCase(),
				grossCents: refund ? 0 : Math.max(t.amount, 0),
				feesCents: t.fee,
				refundsCents: refund ? -t.amount : 0,
				netCents: t.net,
				kind: "other",
			});
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
