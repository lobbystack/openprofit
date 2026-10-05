import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { connector, connectorInfo, connectors } from "#/connectors";
import { db, schema } from "#/db";
import { encrypt } from "#/lib/crypto";
import { PLANS } from "#/lib/plans";
import { isCloud } from "./billing.server";
import { lastMonths } from "./overview.server";
import { syncConnection } from "./sync.server";
import { currentWorkspace } from "./workspace.server";

export type ConnectionRow = {
	id: string;
	provider: string;
	kind: "revenue" | "cost";
	label: string | null;
	status: "active" | "error" | "paused";
	lastError: string | null;
	cadenceMinutes: number;
	lastSyncedAt: number | null;
	// This month, base currency, whole units. Negative for costs.
	amount: number;
};

export const getConnections = createServerFn({ method: "GET" }).handler(
	async (): Promise<ConnectionRow[]> => {
		const ws = await currentWorkspace();
		const from = `${lastMonths(1)[0]}-01`;
		const [conns, rev, cost] = await Promise.all([
			db.query.connections.findMany({
				where: eq(schema.connections.workspaceId, ws.id),
				orderBy: (c, { asc }) => [asc(c.kind), asc(c.createdAt)],
			}),
			db
				.select({
					id: schema.revenueLines.connectionId,
					v: sql<number>`sum(${schema.revenueLines.netBaseCents})`,
				})
				.from(schema.revenueLines)
				.where(
					and(
						eq(schema.revenueLines.workspaceId, ws.id),
						gte(schema.revenueLines.date, from),
					),
				)
				.groupBy(schema.revenueLines.connectionId),
			db
				.select({
					id: schema.costLines.connectionId,
					v: sql<number>`sum(${schema.costLines.amountBaseCents})`,
				})
				.from(schema.costLines)
				.where(
					and(
						eq(schema.costLines.workspaceId, ws.id),
						gte(schema.costLines.date, from),
					),
				)
				.groupBy(schema.costLines.connectionId),
		]);
		const totals = new Map<string | null, number>();
		for (const r of rev) totals.set(r.id, Number(r.v));
		for (const c of cost) totals.set(c.id, -Number(c.v));
		return conns.map((c) => ({
			id: c.id,
			provider: c.provider,
			kind: c.kind,
			label: c.label,
			status: c.status,
			lastError: c.lastError,
			cadenceMinutes: c.cadenceMinutes,
			lastSyncedAt: c.lastSyncedAt,
			amount: Math.round(totals.get(c.id) ?? 0) / 100,
		}));
	},
);

export const getConnectorInfo = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => connectorInfo(connector(data.id)));

export const listConnectors = createServerFn({ method: "GET" }).handler(
	async () => connectors().map(connectorInfo),
);

const Creds = z.record(z.string(), z.string().trim());

export const testConnection = createServerFn({ method: "POST" })
	.validator(z.object({ provider: z.string(), credentials: Creds }))
	.handler(async ({ data }) => {
		await currentWorkspace();
		try {
			const { label } = await connector(data.provider).verify(data.credentials);
			return { ok: true as const, label };
		} catch (err) {
			return {
				ok: false as const,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	});

export const createConnection = createServerFn({ method: "POST" })
	.validator(z.object({ provider: z.string(), credentials: Creds }))
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		const c = connector(data.provider);
		const { label } = await c.verify(data.credentials);
		// One product: lines land there. More: the user assigns them.
		const products = await db.query.products.findMany({
			where: eq(schema.products.workspaceId, ws.id),
		});
		const [conn] = await db
			.insert(schema.connections)
			.values({
				workspaceId: ws.id,
				provider: c.id,
				kind: c.kind,
				label,
				authKind: "key",
				productId: products.length === 1 ? products[0].id : null,
				credentials: await encrypt(data.credentials),
				cadenceMinutes: isCloud ? PLANS[ws.plan].cadenceMinutes : 60,
			})
			.returning();
		// First sync runs now so the overview has a number right away.
		try {
			await syncConnection(conn);
		} catch (err) {
			console.error(`[sync] first sync ${c.id}:`, err);
		}
		return { id: conn.id };
	});

export const syncNow = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		const conn = await db.query.connections.findFirst({
			where: and(
				eq(schema.connections.id, data.id),
				eq(schema.connections.workspaceId, ws.id),
			),
		});
		if (!conn) throw new Error("Not found");
		const { written } = await syncConnection(conn, { backfillDays: 365 });
		return { written };
	});

export const deleteConnection = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		await db
			.delete(schema.connections)
			.where(
				and(
					eq(schema.connections.id, data.id),
					eq(schema.connections.workspaceId, ws.id),
				),
			);
		return { ok: true };
	});
