import { and, eq, gte, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { connector } from "#/connectors";
import type { Credentials } from "#/connectors/types";
import { db, schema } from "#/db";
import { encrypt } from "#/lib/crypto";
import { PLANS } from "#/lib/plans";
import { isCloud } from "./billing.server";
import { lastMonths } from "./overview.server";
import type { Workspace } from "./workspace.server";

export type ConnectionRow = {
	id: string;
	provider: string;
	kind: "revenue" | "cost";
	label: string | null;
	status: "active" | "error" | "paused";
	lastError: string | null;
	cadenceMinutes: number;
	lastSyncedAt: number | null;
	productId: string | null;
	// This month, base currency, whole units. Negative for costs.
	amount: number;
};

// `productId`: the switcher's product. Then only connections that feed it
// (its default product, a mapped sub-unit, or lines this month), with
// that product's share of their amount.
export async function connectionRows(
	ws: Workspace,
	productId: string | null = null,
): Promise<ConnectionRow[]> {
	const from = `${lastMonths(1)[0]}-01`;
	const only = (col: PgColumn) => (productId ? eq(col, productId) : undefined);
	const [conns, rev, cost, mapped] = await Promise.all([
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
					only(schema.revenueLines.productId),
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
					only(schema.costLines.productId),
				),
			)
			.groupBy(schema.costLines.connectionId),
		productId
			? db
					.selectDistinct({ id: schema.productMappings.connectionId })
					.from(schema.productMappings)
					.where(
						and(
							eq(schema.productMappings.workspaceId, ws.id),
							eq(schema.productMappings.productId, productId),
						),
					)
			: [],
	]);
	const totals = new Map<string | null, number>();
	for (const r of rev) totals.set(r.id, Number(r.v));
	for (const c of cost) totals.set(c.id, -Number(c.v));
	const feeds = new Set(mapped.map((m) => m.id));
	const shown = productId
		? conns.filter(
				(c) => c.productId === productId || feeds.has(c.id) || totals.has(c.id),
			)
		: conns;
	return shown.map((c) => ({
		id: c.id,
		provider: c.provider,
		kind: c.kind,
		label: c.label,
		status: c.status,
		lastError: c.lastError,
		cadenceMinutes: c.cadenceMinutes,
		lastSyncedAt: c.lastSyncedAt,
		productId: c.productId,
		amount: Math.round(totals.get(c.id) ?? 0) / 100,
	}));
}

// Verifies the credentials with the provider, then stores the connection
// with them encrypted. Throws the provider's message when they don't work.
// The caller runs the first sync. With no product given and exactly one
// product in the workspace, lines land on that product.
export async function addConnection(
	ws: Workspace,
	input: {
		provider: string;
		credentials: Credentials;
		productId?: string | null;
	},
) {
	const c = connector(input.provider);
	const missing = c.auth.fields.find(
		(f) => !f.optional && !input.credentials[f.name]?.trim(),
	);
	if (missing) throw new Error(`${missing.label} is required.`);
	// Only the connector's own fields are kept.
	const credentials: Credentials = {};
	for (const f of c.auth.fields) {
		const v = input.credentials[f.name]?.trim();
		if (v) credentials[f.name] = v;
	}
	const products = await db.query.products.findMany({
		where: eq(schema.products.workspaceId, ws.id),
	});
	if (input.productId && !products.some((p) => p.id === input.productId))
		throw new Error("That product doesn't exist in this workspace.");
	const { label } = await c.verify(credentials);
	const [conn] = await db
		.insert(schema.connections)
		.values({
			workspaceId: ws.id,
			provider: c.id,
			kind: c.kind,
			label,
			authKind: "key",
			productId:
				input.productId ?? (products.length === 1 ? products[0].id : null),
			credentials: await encrypt(credentials),
			cadenceMinutes: isCloud ? PLANS[ws.plan].cadenceMinutes : 60,
		})
		.returning();
	return conn;
}
