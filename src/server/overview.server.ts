import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { connectors } from "#/connectors";
import { db, schema } from "#/db";
import {
	type MetricKey,
	type OverviewData,
	PERIODS,
	type PeriodKey,
} from "#/lib/overview";
import { convert } from "./fx.server";
import type { Workspace } from "./workspace.server";

const ym = (d: Date) =>
	`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export function lastMonths(n: number, now = new Date()) {
	const out: string[] = [];
	for (const i of Array.from({ length: n }, (_, k) => n - 1 - k)) {
		out.push(
			ym(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))),
		);
	}
	return out;
}

// Months inside a period, oldest first, ending this month or last month.
export function periodMonths(key: PeriodKey, now = new Date()) {
	const monthsBack = (n: number, end = now) => lastMonths(n, end);
	const lastMonth = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
	);
	switch (key) {
		case "last-month":
			return monthsBack(1, lastMonth);
		case "3m":
			return monthsBack(3);
		case "12m":
			return monthsBack(12);
		case "ytd":
			return monthsBack(now.getUTCMonth() + 1);
		default:
			return monthsBack(1);
	}
}

const nextMonth = (m: string) => {
	const [y, mo] = m.split("-").map(Number);
	return ym(new Date(Date.UTC(y, mo, 1)));
};

// Flat costs count once per month they are active, in base cents. Yearly
// ones spread over 12.
export function flatMonthlyCents(
	f: typeof schema.flatCosts.$inferSelect,
	month: string,
) {
	const start = f.startsOn.slice(0, 7);
	const end = f.endsOn?.slice(0, 7);
	if (month < start || (end && month > end)) return 0;
	const cents = f.amountBaseCents ?? f.amountCents;
	return f.interval === "year" ? Math.round(cents / 12) : cents;
}

// `productId`: the product picked in the switcher. Null is All.
export async function overview(
	ws: Workspace,
	periodKey: PeriodKey = "this-month",
	productId: string | null = null,
): Promise<OverviewData> {
	const period = periodMonths(periodKey);
	const end = period[period.length - 1];
	const endDate = new Date(`${end}-15T00:00:00Z`);
	// Chart: 12 months to the period's end. Series: 24, for the previous
	// year and the previous period.
	const months = lastMonths(12, endDate);
	const all = lastMonths(24, endDate);
	const from = `${all[0]}-01`;
	const rangeFrom = `${period[0]}-01`;
	const rangeTo = `${nextMonth(end)}-01`;
	const inRange = (col: PgColumn) => and(gte(col, rangeFrom), lt(col, rangeTo));
	const wsId = ws.id;
	const month = (col: unknown) => sql<string>`substr(${col}, 1, 7)`;
	// Narrows a query to the picked product; no condition for All.
	const only = (col: PgColumn) => (productId ? eq(col, productId) : undefined);

	const [
		rev,
		cost,
		flats,
		snaps,
		prods,
		revByProd,
		costByProd,
		revBySrc,
		costByProv,
		revByProdMonth,
		costByProdMonth,
	] = await Promise.all([
		db
			.select({
				m: month(schema.revenueLines.date),
				v: sql<number>`sum(${schema.revenueLines.netBaseCents})`,
				t: sql<number>`sum(${schema.revenueLines.taxBaseCents})`,
			})
			.from(schema.revenueLines)
			.where(
				and(
					eq(schema.revenueLines.workspaceId, wsId),
					only(schema.revenueLines.productId),
					gte(schema.revenueLines.date, from),
				),
			)
			.groupBy(month(schema.revenueLines.date)),
		db
			.select({
				m: month(schema.costLines.date),
				v: sql<number>`sum(${schema.costLines.amountBaseCents})`,
			})
			.from(schema.costLines)
			.where(
				and(
					eq(schema.costLines.workspaceId, wsId),
					only(schema.costLines.productId),
					gte(schema.costLines.date, from),
				),
			)
			.groupBy(month(schema.costLines.date)),
		db.query.flatCosts.findMany({
			where: and(
				eq(schema.flatCosts.workspaceId, wsId),
				only(schema.flatCosts.productId),
			),
		}),
		db.query.metricSnapshots.findMany({
			where: and(
				eq(schema.metricSnapshots.workspaceId, wsId),
				gte(schema.metricSnapshots.date, from),
				// A connection's MRR and subscriptions count toward the product
				// it's assigned to.
				// ponytail: a revenue account shared by several products counts
				// for its default product only; split snapshots by sub-unit if
				// that matters.
				productId
					? inArray(
							schema.metricSnapshots.connectionId,
							db
								.select({ id: schema.connections.id })
								.from(schema.connections)
								.where(
									and(
										eq(schema.connections.workspaceId, wsId),
										eq(schema.connections.productId, productId),
									),
								),
						)
					: undefined,
			),
		}),
		db.query.products.findMany({
			where: and(
				eq(schema.products.workspaceId, wsId),
				only(schema.products.id),
			),
			orderBy: (p, { asc }) => asc(p.createdAt),
		}),
		db
			.select({
				productId: schema.revenueLines.productId,
				v: sql<number>`sum(${schema.revenueLines.netBaseCents})`,
			})
			.from(schema.revenueLines)
			.where(
				and(
					eq(schema.revenueLines.workspaceId, wsId),
					only(schema.revenueLines.productId),
					inRange(schema.revenueLines.date),
				),
			)
			.groupBy(schema.revenueLines.productId),
		db
			.select({
				productId: schema.costLines.productId,
				v: sql<number>`sum(${schema.costLines.amountBaseCents})`,
			})
			.from(schema.costLines)
			.where(
				and(
					eq(schema.costLines.workspaceId, wsId),
					only(schema.costLines.productId),
					inRange(schema.costLines.date),
				),
			)
			.groupBy(schema.costLines.productId),
		db
			.select({
				provider: schema.connections.provider,
				v: sql<number>`sum(${schema.revenueLines.netBaseCents})`,
				t: sql<number>`sum(${schema.revenueLines.taxBaseCents})`,
			})
			.from(schema.revenueLines)
			.innerJoin(
				schema.connections,
				eq(schema.connections.id, schema.revenueLines.connectionId),
			)
			.where(
				and(
					eq(schema.revenueLines.workspaceId, wsId),
					only(schema.revenueLines.productId),
					inRange(schema.revenueLines.date),
				),
			)
			.groupBy(schema.connections.provider),
		db
			.select({
				provider: schema.costLines.provider,
				v: sql<number>`sum(${schema.costLines.amountBaseCents})`,
			})
			.from(schema.costLines)
			.where(
				and(
					eq(schema.costLines.workspaceId, wsId),
					only(schema.costLines.productId),
					inRange(schema.costLines.date),
				),
			)
			.groupBy(schema.costLines.provider),
		// Per product and month over the chart's 12 months, for each
		// product's own trend line.
		db
			.select({
				productId: schema.revenueLines.productId,
				m: month(schema.revenueLines.date),
				v: sql<number>`sum(${schema.revenueLines.netBaseCents})`,
			})
			.from(schema.revenueLines)
			.where(
				and(
					eq(schema.revenueLines.workspaceId, wsId),
					only(schema.revenueLines.productId),
					gte(schema.revenueLines.date, `${months[0]}-01`),
					lt(schema.revenueLines.date, rangeTo),
				),
			)
			.groupBy(schema.revenueLines.productId, month(schema.revenueLines.date)),
		db
			.select({
				productId: schema.costLines.productId,
				m: month(schema.costLines.date),
				v: sql<number>`sum(${schema.costLines.amountBaseCents})`,
			})
			.from(schema.costLines)
			.where(
				and(
					eq(schema.costLines.workspaceId, wsId),
					only(schema.costLines.productId),
					gte(schema.costLines.date, `${months[0]}-01`),
					lt(schema.costLines.date, rangeTo),
				),
			)
			.groupBy(schema.costLines.productId, month(schema.costLines.date)),
	]);
	// Flat costs saved before amount_base_cents existed: convert once and
	// store it, so they stop counting in their own currency.
	for (const f of flats) {
		if (f.amountBaseCents !== null) continue;
		f.amountBaseCents = await convert(
			f.amountCents,
			f.currency,
			ws.baseCurrency,
			new Date().toISOString().slice(0, 10),
		);
		await db
			.update(schema.flatCosts)
			.set({ amountBaseCents: f.amountBaseCents })
			.where(eq(schema.flatCosts.id, f.id));
	}

	const byMonth = (rows: { m: string; v: number }[]) =>
		Object.fromEntries(rows.map((r) => [r.m, Number(r.v)]));
	const revM = byMonth(rev);
	const taxM = byMonth(rev.map((r) => ({ m: r.m, v: r.t })));
	const costM = byMonth(cost);
	const units = (c: number) => Math.round(c) / 100;

	const revenueAll = all.map((m) => units(revM[m] ?? 0));
	const costsAll = all.map((m) =>
		units(
			(costM[m] ?? 0) + flats.reduce((a, f) => a + flatMonthlyCents(f, m), 0),
		),
	);
	const profitAll = revenueAll.map(
		(r, i) => Math.round((r - costsAll[i]) * 100) / 100,
	);

	// Latest snapshot per connection within each month, summed.
	const snapshot = (metric: "mrr_base_cents" | "customers") =>
		all.map((m) => {
			const latest = new Map<string, { date: string; value: number }>();
			for (const s of snaps) {
				if (s.metric !== metric || s.date.slice(0, 7) > m) continue;
				const prev = latest.get(s.connectionId);
				if (!prev || s.date > prev.date) latest.set(s.connectionId, s);
			}
			let total = 0;
			for (const v of latest.values()) total += v.value;
			return metric === "customers" ? total : units(total);
		});

	const seriesAll: Record<MetricKey, number[]> = {
		revenue: revenueAll,
		costs: costsAll,
		profit: profitAll,
		mrr: snapshot("mrr_base_cents"),
		customers: snapshot("customers"),
	};
	const keys = Object.keys(seriesAll) as MetricKey[];
	const pick = (f: (v: number[]) => number[]) =>
		Object.fromEntries(keys.map((k) => [k, f(seriesAll[k])])) as Record<
			MetricKey,
			number[]
		>;
	const n = period.length;
	const sum = (v: number[]) =>
		Math.round(v.reduce((a, b) => a + b, 0) * 100) / 100;
	const total = (k: MetricKey, v: number[]) =>
		k === "mrr" || k === "customers" ? (v[v.length - 1] ?? 0) : sum(v);
	const totals = (slice: (v: number[]) => number[]) =>
		Object.fromEntries(
			keys.map((k) => [k, total(k, slice(seriesAll[k]))]),
		) as Record<MetricKey, number>;

	const flatByProduct = new Map<string | null, number>();
	const flatByProvider = new Map<string, number>();
	for (const f of flats) {
		const c = period.reduce((a, m) => a + flatMonthlyCents(f, m), 0);
		if (!c) continue;
		flatByProduct.set(f.productId, (flatByProduct.get(f.productId) ?? 0) + c);
		flatByProvider.set(f.provider, (flatByProvider.get(f.provider) ?? 0) + c);
	}
	const sumBy = (rows: { productId: string | null; v: number }[]) =>
		new Map(rows.map((r) => [r.productId, Number(r.v)]));
	const rp = sumBy(revByProd);
	const cp = sumBy(costByProd);
	const cell = (productId: string | null, m: string) => `${productId}|${m}`;
	const rpm = new Map(
		revByProdMonth.map((r) => [cell(r.productId, r.m), Number(r.v)]),
	);
	const cpm = new Map(
		costByProdMonth.map((r) => [cell(r.productId, r.m), Number(r.v)]),
	);
	const profitSeries = (productId: string | null) =>
		months.map((m) =>
			units(
				(rpm.get(cell(productId, m)) ?? 0) -
					(cpm.get(cell(productId, m)) ?? 0) -
					flats
						.filter((f) => f.productId === productId)
						.reduce((a, f) => a + flatMonthlyCents(f, m), 0),
			),
		);
	const byProduct = prods.map((p) => ({
		id: p.id,
		name: p.name,
		slug: p.slug,
		publicPage: p.publicPage,
		revenue: units(rp.get(p.id) ?? 0),
		costs: units((cp.get(p.id) ?? 0) + (flatByProduct.get(p.id) ?? 0)),
		profit: profitSeries(p.id),
	}));
	// Lines and flat costs assigned to no product.
	const unassignedRev = rp.get(null) ?? 0;
	const unassignedCost = (cp.get(null) ?? 0) + (flatByProduct.get(null) ?? 0);
	if (unassignedRev || unassignedCost) {
		byProduct.push({
			id: "unassigned",
			name: "Unassigned",
			slug: "unassigned",
			publicPage: "off" as const,
			revenue: units(unassignedRev),
			costs: units(unassignedCost),
			profit: profitSeries(null),
		});
	}

	const provTotals = new Map<string, number>();
	for (const r of costByProv) provTotals.set(r.provider, Number(r.v));
	for (const [k, v] of flatByProvider)
		provTotals.set(k, (provTotals.get(k) ?? 0) + v);
	const costsByProvider = [...provTotals]
		.map(([provider, cents]) => ({ provider, amount: units(cents) }))
		.sort((a, b) => b.amount - a.amount);

	// Tax collected in the period and the one before, and the part from
	// providers that don't remit it, which the seller files.
	const taxAll = all.map((m) => units(taxM[m] ?? 0));
	const remits = new Set(
		connectors()
			.filter((c) => c.remitsTax)
			.map((c) => c.id),
	);
	const tax = {
		total: sum(taxAll.slice(24 - n)),
		previous: sum(taxAll.slice(24 - 2 * n, 24 - n)),
		owed: units(
			revBySrc
				.filter((r) => !remits.has(r.provider))
				.reduce((a, r) => a + Number(r.t), 0),
		),
	};

	return {
		currency: ws.baseCurrency,
		workspaceSlug: ws.slug,
		snapshots: !productId || snaps.length > 0,
		product: productId
			? (prods
					.filter((p) => p.id === productId)
					.map((p) => ({ id: p.id, name: p.name }))[0] ?? null)
			: null,
		months,
		series: pick((v) => v.slice(12)),
		previousSeries: pick((v) => v.slice(0, 12)),
		period: {
			key: periodKey,
			label: PERIODS.find((p) => p.key === periodKey)?.label ?? "",
			totals: totals((v) => v.slice(24 - n)),
			previous: totals((v) => v.slice(24 - 2 * n, 24 - n)),
			tax,
		},
		byProduct,
		costsByProvider,
		revenueBySource: revBySrc
			.map((r) => ({ provider: r.provider, amount: units(Number(r.v)) }))
			.sort((a, b) => b.amount - a.amount),
	};
}
