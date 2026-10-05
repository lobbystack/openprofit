import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "#/db";
import { lastMonths } from "./overview.server";

export type ProductSeries = {
	currency: string;
	months: string[];
	revenue: number[];
	costs: number[];
	profit: number[];
};

const units = (c: number) => Math.round(c) / 100;

// Monthly revenue, costs and profit for one product, whole units.
export async function productSeries(
	workspaceId: string,
	currency: string,
	productId: string,
	monthsBack = 12,
): Promise<ProductSeries> {
	const months = lastMonths(monthsBack);
	const from = `${months[0]}-01`;
	const month = (col: unknown) => sql<string>`substr(${col}, 1, 7)`;
	const [rev, cost, flats] = await Promise.all([
		db
			.select({
				m: month(schema.revenueLines.date),
				v: sql<number>`sum(${schema.revenueLines.netBaseCents})`,
			})
			.from(schema.revenueLines)
			.where(
				and(
					eq(schema.revenueLines.workspaceId, workspaceId),
					eq(schema.revenueLines.productId, productId),
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
					eq(schema.costLines.workspaceId, workspaceId),
					eq(schema.costLines.productId, productId),
					gte(schema.costLines.date, from),
				),
			)
			.groupBy(month(schema.costLines.date)),
		db.query.flatCosts.findMany({
			where: and(
				eq(schema.flatCosts.workspaceId, workspaceId),
				eq(schema.flatCosts.productId, productId),
			),
		}),
	]);
	const r = new Map(rev.map((x) => [x.m, Number(x.v)]));
	const c = new Map(cost.map((x) => [x.m, Number(x.v)]));
	const revenue = months.map((m) => units(r.get(m) ?? 0));
	const costs = months.map((m) => {
		let flat = 0;
		for (const f of flats) {
			const start = f.startsOn.slice(0, 7);
			const end = f.endsOn?.slice(0, 7);
			if (m < start || (end && m > end)) continue;
			flat +=
				f.interval === "year" ? Math.round(f.amountCents / 12) : f.amountCents;
		}
		return units((c.get(m) ?? 0) + flat);
	});
	return {
		currency,
		months,
		revenue,
		costs,
		profit: revenue.map((v, i) => Math.round((v - costs[i]) * 100) / 100),
	};
}
