import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
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
		const subCol =
			conn.kind === "cost" ? schema.costLines.subUnitId : undefined;
		const rows = subCol
			? await db
					.select({
						id: subCol,
						v: sql<number>`sum(${amountCol})`,
					})
					.from(table)
					.where(
						and(
							eq(table.connectionId, conn.id),
							isNotNull(subCol),
							gte(table.date, from),
						),
					)
					.groupBy(subCol)
			: [];
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
					label: byUnit.get(r.id as string)?.subUnitLabel ?? null,
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
		await db
			.update(schema.costLines)
			.set({ productId: data.productId })
			.where(
				and(
					eq(schema.costLines.connectionId, conn.id),
					eq(schema.costLines.subUnitId, data.subUnitId),
				),
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
		await db
			.update(schema.revenueLines)
			.set({ productId: data.productId })
			.where(eq(schema.revenueLines.connectionId, conn.id));
		await db
			.update(schema.costLines)
			.set({ productId: data.productId })
			.where(
				and(
					eq(schema.costLines.connectionId, conn.id),
					isNull(schema.costLines.subUnitId),
				),
			);
		return { ok: true };
	});
