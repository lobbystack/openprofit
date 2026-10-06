import { createServerFn } from "@tanstack/react-start";
import {
	and,
	eq,
	gte,
	isNotNull,
	isNull,
	notInArray,
	or,
	sql,
} from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { lastMonths } from "./overview.server";
import { currentWorkspace } from "./workspace.server";

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
	productId: string | null;
	subUnits: SubUnit[];
	products: { id: string; name: string }[];
};

// Sub-units (projects, workspaces, zones) seen in this connection's lines,
// with the product each one is assigned to.
export const getConnection = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }): Promise<ConnectionDetail> => {
		const ws = await currentWorkspace();
		const conn = await db.query.connections.findFirst({
			where: and(
				eq(schema.connections.id, data.id),
				eq(schema.connections.workspaceId, ws.id),
			),
		});
		if (!conn) throw new Error("Not found");
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
	});

// Assigns a sub-unit to a product and relabels every line already synced.
export const setMapping = createServerFn({ method: "POST" })
	.validator(
		z.object({
			connectionId: z.string(),
			subUnitId: z.string(),
			productId: z.string().nullable(),
		}),
	)
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		const conn = await db.query.connections.findFirst({
			where: and(
				eq(schema.connections.id, data.connectionId),
				eq(schema.connections.workspaceId, ws.id),
			),
		});
		if (!conn) throw new Error("Not found");
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
		// Unassigned lines follow the connection's product.
		const productId = data.productId ?? conn.productId;
		for (const t of [schema.revenueLines, schema.costLines])
			await db
				.update(t)
				.set({ productId })
				.where(
					and(eq(t.connectionId, conn.id), eq(t.subUnitId, data.subUnitId)),
				);
		return { ok: true };
	});

// Product for the connection's lines that have no sub-unit mapping.
export const setConnectionProduct = createServerFn({ method: "POST" })
	.validator(
		z.object({ connectionId: z.string(), productId: z.string().nullable() }),
	)
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		const conn = await db.query.connections.findFirst({
			where: and(
				eq(schema.connections.id, data.connectionId),
				eq(schema.connections.workspaceId, ws.id),
			),
		});
		if (!conn) throw new Error("Not found");
		await db
			.update(schema.connections)
			.set({ productId: data.productId })
			.where(eq(schema.connections.id, conn.id));
		// Every line without a mapped sub-unit, as the sync assigns them.
		const mapped = db
			.select({ id: schema.productMappings.subUnitId })
			.from(schema.productMappings)
			.where(eq(schema.productMappings.connectionId, conn.id));
		for (const t of [schema.revenueLines, schema.costLines])
			await db
				.update(t)
				.set({ productId: data.productId })
				.where(
					and(
						eq(t.connectionId, conn.id),
						or(isNull(t.subUnitId), notInArray(t.subUnitId, mapped)),
					),
				);
		return { ok: true };
	});
