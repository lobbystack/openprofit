import { and, eq, gt, gte, lt, or } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { connectors } from "#/connectors";
import { db, schema } from "#/db";
import {
	adjustments,
	type BooksIn,
	type Entry,
	expenseAccount,
	journal,
	summarize,
	totals,
} from "#/lib/books";
import { providerName } from "#/lib/providers";
import { depreciation, equipmentOf, total } from "#/lib/tax";
import type { Workspace } from "./workspace.server";

// Loads the data for the books (docs/BOOKS.md) and runs the journal in
// src/lib/books.ts.

const nextMonth = (m: string) => {
	const [y, mo] = m.split("-").map(Number);
	return new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
};

type RevenueRow = typeof schema.revenueLines.$inferSelect;

// Gross, fees and refunds in base cents. Rows synced before the base
// columns derive them from the net (or tax) rate.
// ponytail: a fully refunded payment with no tax has no rate; it counts
// at 1:1 until the next full sync fills the base columns.
function baseAmounts(l: RevenueRow, baseCurrency: string) {
	if (l.grossBaseCents !== null)
		return {
			gross: l.grossBaseCents,
			fees: l.feesBaseCents ?? 0,
			refunds: l.refundsBaseCents ?? 0,
		};
	const rate =
		l.currency === baseCurrency
			? 1
			: l.netCents
				? l.netBaseCents / l.netCents
				: l.taxCents
					? l.taxBaseCents / l.taxCents
					: 1;
	return {
		gross: Math.round(l.grossCents * rate),
		fees: Math.round(l.feesCents * rate),
		refunds: Math.round(l.refundsCents * rate),
	};
}

export async function booksInput(
	ws: Workspace,
	month: string,
	productId: string | null = null,
): Promise<BooksIn> {
	const first = `${month}-01`;
	const after = `${nextMonth(month)}-01`;
	const only = (col: PgColumn) => (productId ? eq(col, productId) : undefined);
	const r = schema.revenueLines;
	const c = schema.costLines;
	const [revenue, costs, payouts, flats, conns] = await Promise.all([
		// Paid in the month, or earning in it.
		db
			.select({ line: r, provider: schema.connections.provider })
			.from(r)
			.innerJoin(schema.connections, eq(schema.connections.id, r.connectionId))
			.where(
				and(
					eq(r.workspaceId, ws.id),
					only(r.productId),
					or(
						and(gte(r.date, first), lt(r.date, after)),
						and(lt(r.serviceStart, after), gt(r.serviceEnd, first)),
					),
				),
			),
		db
			.select()
			.from(c)
			.where(
				and(
					eq(c.workspaceId, ws.id),
					eq(c.source, "sync"),
					only(c.productId),
					gte(c.date, first),
					lt(c.date, after),
				),
			),
		// Payouts belong to the company, not a product.
		productId
			? []
			: db
					.select({ p: schema.payouts, provider: schema.connections.provider })
					.from(schema.payouts)
					.innerJoin(
						schema.connections,
						eq(schema.connections.id, schema.payouts.connectionId),
					)
					.where(
						and(
							eq(schema.payouts.workspaceId, ws.id),
							gte(schema.payouts.date, first),
							lt(schema.payouts.date, after),
						),
					),
		db.query.flatCosts.findMany({
			where: and(
				eq(schema.flatCosts.workspaceId, ws.id),
				only(schema.flatCosts.productId),
			),
		}),
		db.query.connections.findMany({
			where: eq(schema.connections.workspaceId, ws.id),
		}),
	]);
	const remits = new Set(
		connectors()
			.filter((x) => x.remitsTax)
			.map((x) => x.id),
	);
	const conn = new Map(conns.map((x) => [x.id, x]));
	return {
		month,
		incorporatedOn: ws.incorporatedOn,
		providerName,
		revenue: revenue.map(({ line, provider }) => ({
			date: line.date,
			provider,
			productId: line.productId,
			...baseAmounts(line, ws.baseCurrency),
			tax: line.taxBaseCents,
			remitsTax: remits.has(provider),
			serviceStart: line.serviceStart,
			serviceEnd: line.serviceEnd,
		})),
		costs: costs.map((x) => {
			const k = x.connectionId ? conn.get(x.connectionId) : undefined;
			return {
				date: x.date,
				provider: x.provider,
				productId: x.productId,
				amount: x.amountBaseCents,
				method: k?.paidWith ?? "personal",
				since: k?.paidWithSince ?? null,
			};
		}),
		payouts: payouts.map(({ p, provider }) => ({
			date: p.date,
			provider,
			amount: p.amountBaseCents,
		})),
		manual: flats.map((f) => ({
			name: f.name,
			productId: f.productId,
			amount: f.amountBaseCents ?? f.amountCents,
			interval: f.interval,
			startsOn: f.startsOn,
			endsOn: f.endsOn,
			category:
				f.category ??
				(f.provider === "manual" ? "other" : expenseAccount(f.provider)),
			method: f.paidWith,
			since: f.paidWithSince,
		})),
	};
}

// The year's depreciation under the workspace's tax rules (src/lib/tax.ts),
// booked in December.
export const yearDepreciation = (ws: Workspace, input: BooksIn) =>
	input.month.endsWith("-12")
		? total(
				depreciation(
					ws.country,
					ws.incorporatedOn,
					equipmentOf(input.manual),
					Number(input.month.slice(0, 4)),
				),
			)
		: undefined;

// The month's journal, summarized: one entry per source. December carries
// the year's depreciation unless `depreciation` overrides it.
export async function monthEntries(
	ws: Workspace,
	month: string,
	productId: string | null = null,
	depreciation?: number,
) {
	const input = await booksInput(ws, month, productId);
	return summarize(
		journal({
			...input,
			depreciation: depreciation ?? yearDepreciation(ws, input),
		}),
		month,
	);
}

// The journal for an export. A whole-workspace export closes the month:
// exporting it again gives the same entries, and later changes to a closed
// month go out as adjustments in the next export. A one-product export
// closes nothing. `withBank: false` leaves out the entries that move money
// in or out of the company bank account (QuickBooks and Xero bank feeds).
export async function exportJournal(
	ws: Workspace,
	month: string,
	opts: { productId?: string | null; withBank: boolean; depreciation?: number },
): Promise<Entry[]> {
	const keep = (es: Entry[]) =>
		opts.withBank ? es : es.filter((e) => !e.bank);
	if (opts.productId)
		return keep(
			await monthEntries(ws, month, opts.productId, opts.depreciation),
		);

	const exported = await db.query.journalExports.findMany({
		where: eq(schema.journalExports.workspaceId, ws.id),
	});
	const stored = exported.find((x) => x.month === month);
	if (stored) return keep(stored.entries as Entry[]);

	const entries = await monthEntries(ws, month, null, opts.depreciation);
	// Closed months before this one, as exported plus their adjustments so
	// far, against what the data says now.
	for (const closed of exported
		.filter((x) => x.month < month)
		.sort((a, b) => a.month.localeCompare(b.month))) {
		const sent = [
			...(closed.entries as Entry[]).filter(
				(e) => !e.group.startsWith("adjust:"),
			),
			...exported.flatMap((x) =>
				(x.entries as Entry[]).filter(
					(e) => e.group === `adjust:${closed.month}`,
				),
			),
		];
		const now = await monthEntries(ws, closed.month);
		entries.push(
			...adjustments(totals(sent), totals(now), `${month}-01`, closed.month),
		);
	}
	await db
		.insert(schema.journalExports)
		.values({
			workspaceId: ws.id,
			month,
			entries,
			exportedAt: Date.now(),
		})
		.onConflictDoNothing();
	return keep(entries);
}

// Twelve months of journal entries, for the tax report. Closes nothing.
export async function yearEntries(ws: Workspace, year: number) {
	const out: Entry[] = [];
	for (let m = 1; m <= 12; m++)
		out.push(
			...(await monthEntries(ws, `${year}-${String(m).padStart(2, "0")}`)),
		);
	return out;
}
