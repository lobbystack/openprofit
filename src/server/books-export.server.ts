import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import {
	accountName,
	type Entry,
	JOURNAL_FORMATS,
	type JournalFormat,
	XERO_TAX_RATE,
	XERO_TRACKING,
} from "#/lib/books";
import { providerName } from "#/lib/providers";
import { exportJournal } from "./books.server";
import { csvFile, exportWorkspace } from "./export.server";
import type { Workspace } from "./workspace.server";

// The monthly journal as a file to import (docs/BOOKS.md, Export dialog).
// Amounts are base cents; csvCell writes them as units with 2 decimals.

export const Month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

type Row = (string | number | null)[];
type Write = {
	month: string;
	renames: Record<string, string>;
	product: (id: string | null) => string | null;
	// Day before month in dates (QuickBooks outside the US).
	dayFirst: boolean;
};

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

// QuickBooks Online journal entries import: one Journal No. per entry, a
// Debits or a Credits amount per line, products as classes. Account names
// must match the chart of accounts. The help names no date format; the
// company's own one is the safe pick: month first in the US, day first in
// every other QuickBooks country.
// https://quickbooks.intuit.com/learn-support/en-us/help-article/import-export-data-files/import-journal-entries-quickbooks-online/L4tQBwbs7_US_en_US
function quickbooks(entries: Entry[], w: Write): Row[] {
	const date = (s: string) => {
		const [yy, mm, dd] = s.split("-");
		return w.dayFirst ? `${dd}/${mm}/${yy}` : `${mm}/${dd}/${yy}`;
	};
	return [
		[
			"Journal No.",
			"Journal Date",
			"Account Name",
			"Description",
			"Debits",
			"Credits",
			"Class",
		],
		...entries.flatMap((e, i) =>
			e.lines.map((l) => [
				`OP-${w.month}-${i + 1}`,
				date(e.date),
				accountName(l.account, w.renames, providerName),
				e.memo,
				l.debit || null,
				l.credit || null,
				w.product(l.productId),
			]),
		),
	];
}

// Xero manual journal import, with the template's headers unchanged (Xero
// rejects a renamed one). Narration and Date go on a journal's first row
// only; a row with both blank belongs to the journal above. Accounts are
// codes, debits positive and credits negative, dates dd mmm yyyy. Tracking
// takes both the category and the option.
// https://central.xero.com/s/article/Add-import-and-post-manual-journals
function xero(entries: Entry[], w: Write): Row[] {
	const tracking = w.renames[XERO_TRACKING] || "Product";
	const tax = w.renames[XERO_TAX_RATE] || null;
	const date = (s: string) => {
		const [yy, mm, dd] = s.split("-");
		return `${dd} ${MONTHS[Number(mm) - 1]} ${yy}`;
	};
	return [
		[
			"*Narration",
			"*Date",
			"Description",
			"*AccountCode",
			"*TaxRate",
			"*Amount",
			"TrackingName1",
			"TrackingOption1",
			"TrackingName2",
			"TrackingOption2",
		],
		...entries.flatMap((e) =>
			e.lines.map((l, i) => {
				const product = w.product(l.productId);
				return [
					i ? null : e.memo,
					i ? null : date(e.date),
					e.memo,
					accountName(l.account, w.renames, providerName),
					tax,
					l.debit - l.credit,
					product && tracking,
					product,
					null,
					null,
				];
			}),
		),
	];
}

// Any other software, with OpenProfit's account names.
function plain(entries: Entry[], w: Write): Row[] {
	return [
		["Date", "Account", "Product", "Description", "Debit", "Credit"],
		...entries.flatMap((e) =>
			e.lines.map((l) => [
				e.date,
				accountName(l.account, null, providerName),
				w.product(l.productId),
				e.memo,
				l.debit || null,
				l.credit || null,
			]),
		),
	];
}

const WRITERS = { quickbooks, xero, plain };

// The file for a month that has ended. QuickBooks and Xero leave out the
// company bank account's entries, which their bank feeds bring in.
// Exporting the whole workspace closes the month (exportJournal).
export async function journalCsv(
	ws: Workspace,
	month: string,
	format: JournalFormat,
	productId: string | null,
): Promise<{ csv: string } | { error: string }> {
	if (month >= new Date().toISOString().slice(0, 7))
		return { error: "Export a month once it has ended." };
	const products = await db.query.products.findMany({
		where: eq(schema.products.workspaceId, ws.id),
	});
	if (productId && !products.some((p) => p.id === productId))
		return { error: "No product with that id in this workspace." };
	const entries = await exportJournal(ws, month, {
		productId,
		withBank: format === "plain",
	});
	const names = new Map(products.map((p) => [p.id, p.name]));
	const rows = WRITERS[format](entries, {
		month,
		renames: ws.bookAccounts ?? {},
		product: (id) => (id && names.get(id)) || null,
		dayFirst: Boolean(ws.country && ws.country !== "US"),
	});
	return { csv: csvFile(rows) };
}

// GET /api/journal.csv?month=YYYY-MM&format=quickbooks|xero|plain&product=id
export async function journalDownload(request: Request) {
	const ws = await exportWorkspace(request);
	if (!ws) return new Response("Sign in to export.", { status: 401 });
	const params = new URL(request.url).searchParams;
	const q = z
		.object({ month: Month, format: z.enum(JOURNAL_FORMATS) })
		.safeParse({ month: params.get("month"), format: params.get("format") });
	if (!q.success)
		return new Response(
			"Use month=YYYY-MM and format=quickbooks, xero or plain.",
			{ status: 400 },
		);
	const { month, format } = q.data;
	const out = await journalCsv(
		ws,
		month,
		format,
		params.get("product") || null,
	);
	if ("error" in out) return new Response(out.error, { status: 400 });
	return new Response(out.csv, {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="openprofit-${ws.slug}-${month}-${format}.csv"`,
			"Cache-Control": "no-store",
		},
	});
}
