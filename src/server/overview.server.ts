import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "#/db";
import type { OverviewData } from "#/lib/overview";
import type { Workspace } from "./workspace.server";

const ym = (d: Date) =>
	`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export function lastMonths(n: number, now = new Date()) {
	const out: string[] = [];
	for (let i = n - 1; i >= 0; i--) {
		out.push(
			ym(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))),
		);
	}
	return out;
}

// Flat costs count once per month they are active. Yearly ones spread over 12.
function flatMonthlyCents(
	f: typeof schema.flatCosts.$inferSelect,
	month: string,
) {
	const start = f.startsOn.slice(0, 7);
	const end = f.endsOn?.slice(0, 7);
	if (month < start || (end && month > end)) return 0;
	return f.interval === "year" ? Math.round(f.amountCents / 12) : f.amountCents;
}

export async function overview(
	ws: Workspace,
	monthsBack = 12,
): Promise<OverviewData> {
	const months = lastMonths(monthsBack);
	const from = `${months[0]}-01`;
	const current = months[months.length - 1];
	const wsId = ws.id;
	const month = (col: unknown) => sql<string>`substr(${col}, 1, 7)`;

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
	] = await Promise.all([
		db
			.select({
				m: month(schema.revenueLines.date),
				v: sql<number>`sum(${schema.revenueLines.netBaseCents})`,
			})
			.from(schema.revenueLines)
			.where(
				and(
					eq(schema.revenueLines.workspaceId, wsId),
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
					gte(schema.costLines.date, from),
				),
			)
			.groupBy(month(schema.costLines.date)),
		db.query.flatCosts.findMany({
			where: eq(schema.flatCosts.workspaceId, wsId),
		}),
		db.query.metricSnapshots.findMany({
			where: and(
				eq(schema.metricSnapshots.workspaceId, wsId),
				gte(schema.metricSnapshots.date, from),
			),
		}),
		db.query.products.findMany({
			where: eq(schema.products.workspaceId, wsId),
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
					gte(schema.revenueLines.date, `${current}-01`),
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
					gte(schema.costLines.date, `${current}-01`),
				),
			)
			.groupBy(schema.costLines.productId),
		db
			.select({
				provider: schema.connections.provider,
				v: sql<number>`sum(${schema.revenueLines.netBaseCents})`,
			})
			.from(schema.revenueLines)
			.innerJoin(
				schema.connections,
				eq(schema.connections.id, schema.revenueLines.connectionId),
			)
			.where(
				and(
					eq(schema.revenueLines.workspaceId, wsId),
					gte(schema.revenueLines.date, `${current}-01`),
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
					gte(schema.costLines.date, `${current}-01`),
				),
			)
			.groupBy(schema.costLines.provider),
	]);

	const byMonth = (rows: { m: string; v: number }[]) =>
		Object.fromEntries(rows.map((r) => [r.m, Number(r.v)]));
	const revM = byMonth(rev);
	const costM = byMonth(cost);
	const units = (c: number) => Math.round(c) / 100;

	const revenue = months.map((m) => units(revM[m] ?? 0));
	const costs = months.map((m) =>
		units(
			(costM[m] ?? 0) + flats.reduce((a, f) => a + flatMonthlyCents(f, m), 0),
		),
	);
	const profit = revenue.map((r, i) => Math.round((r - costs[i]) * 100) / 100);

	// Latest snapshot per connection within each month, summed.
	const snapshot = (metric: "mrr_base_cents" | "customers") =>
		months.map((m) => {
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

	const flatByProduct = new Map<string | null, number>();
	const flatByProvider = new Map<string, number>();
	for (const f of flats) {
		const c = flatMonthlyCents(f, current);
		if (!c) continue;
		flatByProduct.set(f.productId, (flatByProduct.get(f.productId) ?? 0) + c);
		flatByProvider.set(f.provider, (flatByProvider.get(f.provider) ?? 0) + c);
	}
	const sumBy = (rows: { productId: string | null; v: number }[]) =>
		new Map(rows.map((r) => [r.productId, Number(r.v)]));
	const rp = sumBy(revByProd);
	const cp = sumBy(costByProd);
	const byProduct = prods.map((p) => ({
		id: p.id,
		name: p.name,
		slug: p.slug,
		publicPage: p.publicPage,
		revenue: units(rp.get(p.id) ?? 0),
		costs: units((cp.get(p.id) ?? 0) + (flatByProduct.get(p.id) ?? 0)),
	}));
	const sharedRev = rp.get(null) ?? 0;
	const sharedCost = (cp.get(null) ?? 0) + (flatByProduct.get(null) ?? 0);
	if (sharedRev || sharedCost) {
		byProduct.push({
			id: "shared",
			name: "Shared",
			slug: "shared",
			publicPage: "off" as const,
			revenue: units(sharedRev),
			costs: units(sharedCost),
		});
	}

	const provTotals = new Map<string, number>();
	for (const r of costByProv) provTotals.set(r.provider, Number(r.v));
	for (const [k, v] of flatByProvider)
		provTotals.set(k, (provTotals.get(k) ?? 0) + v);
	const costsByProvider = [...provTotals]
		.map(([provider, cents]) => ({ provider, amount: units(cents) }))
		.sort((a, b) => b.amount - a.amount);

	return {
		currency: ws.baseCurrency,
		workspaceSlug: ws.slug,
		months,
		series: {
			revenue,
			costs,
			profit,
			mrr: snapshot("mrr_base_cents"),
			customers: snapshot("customers"),
		},
		byProduct,
		costsByProvider,
		revenueBySource: revBySrc
			.map((r) => ({ provider: r.provider, amount: units(Number(r.v)) }))
			.sort((a, b) => b.amount - a.amount),
	};
}
