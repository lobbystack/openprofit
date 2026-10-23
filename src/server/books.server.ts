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
	nextMonth,
	summarize,
	totals,
} from "#/lib/books";
import { providerName } from "#/lib/providers";
import { depreciation, equipmentOf, total } from "#/lib/tax";
import type { Workspace } from "./workspace.server";

// Loads the data for the books (docs/BOOKS.md) and runs the journal in
// src/lib/books.ts.

type RevenueRow = typeof schema.revenueLines.$inferSelect;

// Gross and refunds in base cents. Rows synced before the base columns
// derive them from the net (or tax) rate. Fees are whatever net leaves out
// of them, Stripe's own charges and lost disputes included, so a provider's
// balance moves by net.
// ponytail: a fully refunded payment with no tax has no rate; it counts
// at 1:1 until the next full sync fills the base columns.
function baseAmounts(l: RevenueRow, baseCurrency: string) {
	const rate =
		l.currency === baseCurrency
			? 1
			: l.netCents
				? l.netBaseCents / l.netCents
				: l.taxCents
					? l.taxBaseCents / l.taxCents
					: 1;
	const gross = l.grossBaseCents ?? Math.round(l.grossCents * rate);
	const refunds = l.refundsBaseCents ?? Math.round(l.refundsCents * rate);
	return { gross, refunds, fees: gross - refunds - l.netBaseCents };
}

// The books input for each month, from one read of the span they cover.
export async function booksInputs(
	ws: Workspace,
	months: string[],
	productId: string | null = null,
): Promise<BooksIn[]> {
	if (!months.length) return [];
	const sorted = [...months].sort();
	const first = `${sorted[0]}-01`;
	const after = `${nextMonth(sorted[sorted.length - 1])}-01`;
	const only = (col: PgColumn) => (productId ? eq(col, productId) : undefined);
	const r = schema.revenueLines;
	const c = schema.costLines;
	const [revenue, costs, payouts, flats, conns] = await Promise.all([
		// Paid in the span, or earning in it.
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
	const revenueIn = revenue.map(({ line, provider }) => ({
		date: line.date,
		provider,
		productId: line.productId,
		...baseAmounts(line, ws.baseCurrency),
		tax: line.taxBaseCents,
		remitsTax: remits.has(provider),
		serviceStart: line.serviceStart,
		serviceEnd: line.serviceEnd,
	}));
	const costsIn = costs.map((x) => {
		const k = x.connectionId ? conn.get(x.connectionId) : undefined;
		return {
			date: x.date,
			provider: x.provider,
			productId: x.productId,
			amount: x.amountBaseCents,
			method: k?.paidWith ?? "personal",
			since: k?.paidWithSince ?? null,
		};
	});
	const payoutsIn = payouts.map(({ p, provider }) => ({
		date: p.date,
		provider,
		amount: p.amountBaseCents,
	}));
	const manual = flats.map((f) => ({
		name: f.name,
		productId: f.productId,
		amount: f.amountBaseCents ?? f.amountCents,
		interval: f.interval,
		startsOn: f.startsOn,
		endsOn: f.endsOn,
		category: f.category ?? expenseAccount(f.provider),
		method: f.paidWith,
		since: f.paidWithSince,
	}));
	return months.map((month) => {
		const from = `${month}-01`;
		const to = `${nextMonth(month)}-01`;
		const inMonth = (x: { date: string }) => x.date >= from && x.date < to;
		return {
			month,
			incorporatedOn: ws.incorporatedOn,
			providerName,
			// Paid in the month, or earning in it.
			revenue: revenueIn.filter(
				(x) =>
					inMonth(x) ||
					(x.serviceStart !== null &&
						x.serviceEnd !== null &&
						x.serviceStart < to &&
						x.serviceEnd > from),
			),
			costs: costsIn.filter(inMonth),
			payouts: payoutsIn.filter(inMonth),
			manual,
		};
	});
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
// the year's depreciation.
const entriesOf = (ws: Workspace, input: BooksIn) =>
	summarize(
		journal({ ...input, depreciation: yearDepreciation(ws, input) }),
		input.month,
	);

// The journal for an export. A whole-workspace export closes the month:
// exporting it again gives the same entries, and later changes to a closed
// month go out as adjustments in the next export. A one-product export
// closes nothing. `withBank: false` leaves out the entries that move money
// in or out of the company bank account (QuickBooks and Xero bank feeds).
export async function exportJournal(
	ws: Workspace,
	month: string,
	opts: { productId?: string | null; withBank: boolean },
): Promise<Entry[]> {
	const keep = (es: Entry[]) =>
		opts.withBank ? es : es.filter((e) => !e.bank);
	if (opts.productId) {
		const [input] = await booksInputs(ws, [month], opts.productId);
		return keep(entriesOf(ws, input));
	}

	const exported = await db.query.journalExports.findMany({
		where: eq(schema.journalExports.workspaceId, ws.id),
	});
	const stored = exported.find((x) => x.month === month);
	if (stored) return keep(stored.entries as Entry[]);

	// Closed months before this one, as exported plus their adjustments so
	// far, against what the data says now.
	const closed = exported
		.filter((x) => x.month < month)
		.sort((a, b) => a.month.localeCompare(b.month));
	const [input, ...nows] = await booksInputs(ws, [
		month,
		...closed.map((x) => x.month),
	]);
	const entries = entriesOf(ws, input);
	closed.forEach((c, i) => {
		const sent = [
			...(c.entries as Entry[]).filter((e) => !e.group.startsWith("adjust:")),
			...exported.flatMap((x) =>
				(x.entries as Entry[]).filter((e) => e.group === `adjust:${c.month}`),
			),
		];
		entries.push(
			...adjustments(
				totals(sent),
				totals(entriesOf(ws, nows[i])),
				`${month}-01`,
				c.month,
			),
		);
	});
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
	const months = Array.from(
		{ length: 12 },
		(_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
	);
	return (await booksInputs(ws, months)).flatMap((i) => entriesOf(ws, i));
}
