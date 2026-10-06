import { register } from "./registry";
import {
	type CostLine,
	type Credentials,
	getJson,
	type SyncRange,
	toCents,
} from "./types";

const BASE = "https://api.digitalocean.com/v2";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.token}` });

type Page = { links?: { pages?: { next?: string } } };
type Invoice = { invoice_uuid: string; invoice_period: string };
type Item = { product: string; amount: string; project_name?: string };

// Follow links.pages.next until the last page.
// https://docs.digitalocean.com/reference/api/reference/#section-links
async function all<T>(c: Credentials, url: string, pick: (p: T) => void) {
	let next: string | undefined = url;
	while (next) {
		const page: T & Page = await getJson<T & Page>(next, {
			headers: headers(c),
		});
		pick(page);
		next = page.links?.pages?.next;
	}
}

// One line per project and product for an invoice month. Amounts are USD
// strings. The month-to-date preview grows daily, so ids carry the month
// and the final invoice replaces the preview's figures.
export function invoiceLines(period: string, items: Item[]): CostLine[] {
	const sums = new Map<
		string,
		{ product: string; project?: string; dollars: number }
	>();
	for (const i of items) {
		const project = i.project_name || undefined;
		const key = `${project ?? "none"}:${i.product}`;
		const s = sums.get(key) ?? { product: i.product, project, dollars: 0 };
		s.dollars += Number(i.amount);
		sums.set(key, s);
	}
	const out: CostLine[] = [];
	for (const [key, s] of sums) {
		const cents = toCents(s.dollars);
		if (!cents) continue;
		out.push({
			externalId: `${period}:${key}`,
			date: `${period}-01`,
			currency: "USD",
			amountCents: cents,
			service: s.product,
			subUnitId: s.project,
			subUnitLabel: s.project,
		});
	}
	return out;
}

export const digitalocean = register({
	id: "digitalocean",
	name: "DigitalOcean",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{
				name: "token",
				label: "Personal access token",
				placeholder: "dop_v1_…",
				secret: true,
			},
		],
		createUrl: "https://cloud.digitalocean.com/account/api/tokens",
		scopes: ["Custom scopes: billing:read and account:read"],
	},
	async verify(c) {
		// https://docs.digitalocean.com/reference/api/reference/account/#account_get
		const a = await getJson<{
			account: { email: string; team?: { name: string } };
		}>(`${BASE}/account`, { headers: headers(c) });
		// https://docs.digitalocean.com/reference/api/reference/billing/#invoices_list
		await getJson(`${BASE}/customers/my/invoices?per_page=1`, {
			headers: headers(c),
		});
		return { label: a.account.team?.name ?? a.account.email };
	},
	// Monthly, from invoices: past months from the issued invoice, this month
	// from the daily preview.
	async fetchCosts(c, range: SyncRange) {
		const from = range.from.slice(0, 7);
		const to = range.to.slice(0, 7);
		const inRange = (p: string) => p >= from && p <= to;
		const invoices: Invoice[] = [];
		let preview: Invoice | undefined;
		// https://docs.digitalocean.com/reference/api/reference/billing/#invoices_list
		await all<{ invoices?: Invoice[]; invoice_preview?: Invoice }>(
			c,
			`${BASE}/customers/my/invoices?per_page=200`,
			(p) => {
				invoices.push(
					...(p.invoices ?? []).filter((i) => inRange(i.invoice_period)),
				);
				preview ??= p.invoice_preview;
			},
		);
		if (
			preview &&
			inRange(preview.invoice_period) &&
			!invoices.some((i) => i.invoice_period === preview?.invoice_period)
		)
			invoices.push({ ...preview, invoice_uuid: "preview" });
		const out: CostLine[] = [];
		for (const inv of invoices) {
			const items: Item[] = [];
			// "preview" in place of the uuid reads the month-to-date invoice.
			// https://docs.digitalocean.com/reference/api/reference/billing/#invoices_get_byUUID
			await all<{ invoice_items?: Item[] }>(
				c,
				`${BASE}/customers/my/invoices/${inv.invoice_uuid}?per_page=200`,
				(p) => items.push(...(p.invoice_items ?? [])),
			);
			out.push(...invoiceLines(inv.invoice_period, items));
		}
		return out;
	},
});
