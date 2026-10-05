import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "#/db";
import { lastMonths } from "./overview.server";
import { currentWorkspace } from "./workspace.server";

export type ConnectionRow = {
	id: string;
	provider: string;
	kind: "revenue" | "cost";
	label: string | null;
	status: "active" | "error" | "paused";
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
			cadenceMinutes: c.cadenceMinutes,
			lastSyncedAt: c.lastSyncedAt,
			amount: Math.round(totals.get(c.id) ?? 0) / 100,
		}));
	},
);
