import "@tanstack/react-start/server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { providerName } from "#/lib/providers";
import { sessionUser } from "./auth.server";
import { flatMonthlyCents } from "./overview.server";
import { currentWorkspace } from "./workspace.server";

// GET /api/export.csv?from=YYYY-MM-DD&to=YYYY-MM-DD: revenue lines, cost
// lines and flat costs in one file, this calendar year by default.
//
// One file with a Type column rather than one per type: spreadsheets and
// bank-statement style imports (Xero, QuickBooks) take a single table with
// one signed Amount column, so revenue is positive, costs are negative and
// the column sums to profit.

const Day = z.iso.date();

const HEADER = [
	"Date",
	"Type",
	"Provider",
	"Sub-unit",
	"Product",
	"Description",
	"Amount",
	"Currency",
	"Base amount",
	"Base currency",
];

const KIND = {
	subscription: "Subscription",
	one_time: "One-time",
	other: "Other",
};

// Text cells: a leading = + - @ tab or carriage return makes spreadsheets
// run the cell as a formula, so it gets a ' in front (OWASP, CSV injection).
// Then RFC 4180 quoting. Numbers are ours and pass through.
export function csvCell(v: string | number | null) {
	if (v === null) return "";
	if (typeof v === "number") return (v / 100).toFixed(2);
	const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
	return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export async function exportCsv(request: Request) {
	// Session only. API tokens (`Authorization: Bearer op_...`) resolve to
	// their workspace here once they exist.
	if (!(await sessionUser())) {
		return new Response("Sign in to export.", { status: 401 });
	}
	const ws = await currentWorkspace();

	const year = new Date().getUTCFullYear();
	const params = new URL(request.url).searchParams;
	const range = z
		.object({ from: Day, to: Day })
		.refine((r) => r.from <= r.to)
		.safeParse({
			from: params.get("from") ?? `${year}-01-01`,
			to: params.get("to") ?? `${year}-12-31`,
		});
	if (!range.success) {
		return new Response("Use dates as YYYY-MM-DD, with from on or before to.", {
			status: 400,
		});
	}
	const { from, to } = range.data;

	const [revenue, costs, flats, products] = await Promise.all([
		db
			.select({
				date: schema.revenueLines.date,
				provider: schema.connections.provider,
				subUnitId: schema.revenueLines.subUnitId,
				subUnitLabel: schema.revenueLines.subUnitLabel,
				productId: schema.revenueLines.productId,
				kind: schema.revenueLines.kind,
				cents: schema.revenueLines.netCents,
				currency: schema.revenueLines.currency,
				baseCents: schema.revenueLines.netBaseCents,
			})
			.from(schema.revenueLines)
			.innerJoin(
				schema.connections,
				eq(schema.connections.id, schema.revenueLines.connectionId),
			)
			.where(
				and(
					eq(schema.revenueLines.workspaceId, ws.id),
					gte(schema.revenueLines.date, from),
					lte(schema.revenueLines.date, to),
				),
			),
		db.query.costLines.findMany({
			where: and(
				eq(schema.costLines.workspaceId, ws.id),
				gte(schema.costLines.date, from),
				lte(schema.costLines.date, to),
			),
		}),
		db.query.flatCosts.findMany({
			where: eq(schema.flatCosts.workspaceId, ws.id),
		}),
		db.query.products.findMany({
			where: eq(schema.products.workspaceId, ws.id),
		}),
	]);
	const names = new Map(products.map((p) => [p.id, p.name]));
	const product = (id: string | null) => (id && names.get(id)) || "Shared";

	type Row = (string | number | null)[];
	const rows: Row[] = [];
	for (const r of revenue) {
		rows.push([
			r.date,
			"Revenue",
			providerName(r.provider),
			r.subUnitLabel ?? r.subUnitId,
			product(r.productId),
			KIND[r.kind],
			r.cents,
			r.currency,
			r.baseCents,
			ws.baseCurrency,
		]);
	}
	for (const c of costs) {
		rows.push([
			c.date,
			"Cost",
			providerName(c.provider),
			c.subUnitLabel ?? c.subUnitId,
			product(c.productId),
			c.service,
			-c.amountCents,
			c.currency,
			-c.amountBaseCents,
			ws.baseCurrency,
		]);
	}
	// A flat cost counts on the first of each month it is active, yearly ones
	// spread over 12, as on the Costs page. Never past this month.
	const thisMonth = new Date().toISOString().slice(0, 7);
	for (const f of flats) {
		const first = from > f.startsOn ? from : f.startsOn;
		const d = new Date(`${first.slice(0, 7)}-01T00:00:00Z`);
		for (; ; d.setUTCMonth(d.getUTCMonth() + 1)) {
			const day = d.toISOString().slice(0, 10);
			if (day > to || day.slice(0, 7) > thisMonth) break;
			if (day < from) continue;
			const base = flatMonthlyCents(f, day.slice(0, 7));
			if (!base) continue;
			rows.push([
				day,
				"Flat cost",
				f.provider === "manual" ? null : providerName(f.provider),
				null,
				product(f.productId),
				f.name,
				-(f.interval === "year"
					? Math.round(f.amountCents / 12)
					: f.amountCents),
				f.currency,
				-base,
				ws.baseCurrency,
			]);
		}
	}
	rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

	// The BOM tells Excel the file is UTF-8.
	const csv = `﻿${[HEADER, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
	return new Response(csv, {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="openprofit-${ws.slug}-${from}-to-${to}.csv"`,
			"Cache-Control": "no-store",
		},
	});
}
