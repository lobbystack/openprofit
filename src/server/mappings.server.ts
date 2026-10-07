import { and, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { db, schema } from "#/db";
import { lastMonths } from "./overview.server";
import type { Workspace } from "./workspace.server";

export type SubUnit = {
	id: string;
	label: string | null;
	// This month, base currency, whole units.
	amount: number;
	productId: string | null;
};

export type ConnectionDetail = {
	id: string;
	provider: string;
	kind: "revenue" | "cost";
	label: string | null;
	// The product of lines without a sub-unit; for providers without
	// sub-units, of every line.
	productId: string | null;
	// Lines without a sub-unit, when a provider with sub-units has any.
	withoutSubUnit: { amount: number } | null;
	subUnits: SubUnit[];
	products: { id: string; name: string }[];
};

// The connection, when it is in the workspace and the product (if any) is
// too.
async function findConnection(
	ws: Workspace,
	id: string,
	productId?: string | null,
) {
	if (productId) {
		const product = await db.query.products.findFirst({
			where: and(
				eq(schema.products.id, productId),
				eq(schema.products.workspaceId, ws.id),
			),
		});
		if (!product) throw new Error("That product doesn't exist.");
	}
	return db.query.connections.findFirst({
		where: and(
			eq(schema.connections.id, id),
			eq(schema.connections.workspaceId, ws.id),
		),
	});
}

// Sub-units (projects, workspaces, zones) seen in this connection's lines,
// with the product each one is assigned to. Null when the workspace has no
// such connection.
export async function connectionDetail(
	ws: Workspace,
	id: string,
): Promise<ConnectionDetail | null> {
	const conn = await findConnection(ws, id);
	if (!conn) return null;
	const from = `${lastMonths(1)[0]}-01`;
	const table = conn.kind === "cost" ? schema.costLines : schema.revenueLines;
	const amountCol =
		conn.kind === "cost"
			? schema.costLines.amountBaseCents
			: schema.revenueLines.netBaseCents;
	const rows = await db
		.select({
			id: table.subUnitId,
			// The most recent label the provider reported.
			label: sql<
				string | null
			>`(array_agg(${table.subUnitLabel} order by ${table.date} desc) filter (where ${table.subUnitLabel} is not null))[1]`,
			v: sql<number>`sum(${amountCol})`,
		})
		.from(table)
		.where(
			and(
				eq(table.connectionId, conn.id),
				isNotNull(table.subUnitId),
				gte(table.date, from),
			),
		)
		.groupBy(table.subUnitId);
	// Lines that belong to no sub-unit: whether there are any, and this
	// month's amount. They follow the connection's own product.
	const [loose] = await db
		.select({
			n: sql<number>`count(*)`,
			v: sql<number>`coalesce(sum(${amountCol}) filter (where ${table.date} >= ${from}), 0)`,
		})
		.from(table)
		.where(and(eq(table.connectionId, conn.id), isNull(table.subUnitId)));
	const [mappings, products] = await Promise.all([
		db.query.productMappings.findMany({
			where: eq(schema.productMappings.connectionId, conn.id),
		}),
		db.query.products.findMany({
			where: eq(schema.products.workspaceId, ws.id),
			orderBy: (p, { asc }) => asc(p.createdAt),
		}),
	]);
	const byUnit = new Map(mappings.map((m) => [m.subUnitId, m]));
	return {
		id: conn.id,
		provider: conn.provider,
		kind: conn.kind,
		label: conn.label,
		productId: conn.productId,
		withoutSubUnit:
			Number(loose?.n ?? 0) > 0
				? { amount: Math.round(Number(loose.v)) / 100 }
				: null,
		subUnits: rows
			.filter((r) => r.id)
			.map((r) => ({
				id: r.id as string,
				label: r.label ?? byUnit.get(r.id as string)?.subUnitLabel ?? null,
				amount: Math.round(Number(r.v)) / 100,
				productId: byUnit.get(r.id as string)?.productId ?? null,
			}))
			.sort((a, b) => b.amount - a.amount),
		products: products.map((p) => ({ id: p.id, name: p.name })),
	};
}

// Assigns a sub-unit to a product, or unassigns it with null, and relabels
// every line already synced. Returns the connection, or null when the
// workspace has no such connection.
export async function assignSubUnit(
	ws: Workspace,
	data: { connectionId: string; subUnitId: string; productId: string | null },
) {
	const conn = await findConnection(ws, data.connectionId, data.productId);
	if (!conn) return null;
	if (data.productId) {
		await db
			.insert(schema.productMappings)
			.values({
				workspaceId: ws.id,
				connectionId: conn.id,
				subUnitId: data.subUnitId,
				productId: data.productId,
			})
			.onConflictDoUpdate({
				target: [
					schema.productMappings.connectionId,
					schema.productMappings.subUnitId,
				],
				set: { productId: data.productId },
			});
	} else {
		await db
			.delete(schema.productMappings)
			.where(
				and(
					eq(schema.productMappings.connectionId, conn.id),
					eq(schema.productMappings.subUnitId, data.subUnitId),
				),
			);
	}
	// An unassigned sub-unit's lines belong to no product.
	for (const t of [schema.revenueLines, schema.costLines])
		await db
			.update(t)
			.set({ productId: data.productId })
			.where(and(eq(t.connectionId, conn.id), eq(t.subUnitId, data.subUnitId)));
	return conn;
}

// Product for the connection's lines that belong to no sub-unit: all of
// them for providers without sub-units (Stripe, Twilio).
export async function assignConnection(
	ws: Workspace,
	data: { connectionId: string; productId: string | null },
) {
	const conn = await findConnection(ws, data.connectionId, data.productId);
	if (!conn) return null;
	await db
		.update(schema.connections)
		.set({ productId: data.productId })
		.where(eq(schema.connections.id, conn.id));
	for (const t of [schema.revenueLines, schema.costLines])
		await db
			.update(t)
			.set({ productId: data.productId })
			.where(and(eq(t.connectionId, conn.id), isNull(t.subUnitId)));
	return conn;
}
