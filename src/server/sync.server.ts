import { and, eq, lte, or, sql } from "drizzle-orm";
import { connector } from "#/connectors";
import type { Credentials } from "#/connectors/types";
import { db, schema } from "#/db";
import { decrypt } from "#/lib/crypto";
import { evaluateAlerts } from "./alerts.server";
import { convert } from "./fx.server";

type Connection = typeof schema.connections.$inferSelect;

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) =>
	new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

// Pull one connection. Lines are upserted by external id, so re-running a
// range is safe.
export async function syncConnection(
	conn: Connection,
	opts: { backfillDays?: number } = {},
) {
	const c = connector(conn.provider);
	const ws = await db.query.workspaces.findFirst({
		where: eq(schema.workspaces.id, conn.workspaceId),
	});
	if (!ws) throw new Error("workspace missing");
	const [run] = await db
		.insert(schema.syncRuns)
		.values({ connectionId: conn.id, startedAt: Date.now(), status: "running" })
		.returning();

	// First sync pulls a year so the chart has history; later runs pull a
	// short tail. Polar caps day-interval queries at 366 days.
	const from = daysAgo(opts.backfillDays ?? (conn.lastSyncedAt ? 3 : 365));
	const range = { from, to: today() };
	let written = 0;

	try {
		const creds = await decrypt<Credentials>(conn.credentials);

		if (c.fetchRevenue) {
			const lines = await c.fetchRevenue(creds, range);
			for (const l of lines) {
				const netBase = await convert(
					l.netCents,
					l.currency,
					ws.baseCurrency,
					l.date,
				);
				await db
					.insert(schema.revenueLines)
					.values({
						workspaceId: ws.id,
						connectionId: conn.id,
						productId: await productFor(conn, l.subUnitId),
						date: l.date,
						currency: l.currency,
						grossCents: l.grossCents,
						feesCents: l.feesCents,
						refundsCents: l.refundsCents,
						netCents: l.netCents,
						netBaseCents: netBase,
						kind: l.kind,
						externalId: l.externalId,
					})
					.onConflictDoUpdate({
						target: [
							schema.revenueLines.connectionId,
							schema.revenueLines.externalId,
						],
						set: {
							grossCents: l.grossCents,
							feesCents: l.feesCents,
							refundsCents: l.refundsCents,
							netCents: l.netCents,
							netBaseCents: netBase,
						},
					});
				written++;
			}
		}

		if (c.fetchCosts) {
			const lines = await c.fetchCosts(creds, range);
			for (const l of lines) {
				const base = await convert(
					l.amountCents,
					l.currency,
					ws.baseCurrency,
					l.date,
				);
				await db
					.insert(schema.costLines)
					.values({
						workspaceId: ws.id,
						connectionId: conn.id,
						productId: await productFor(conn, l.subUnitId),
						provider: conn.provider,
						date: l.date,
						currency: l.currency,
						amountCents: l.amountCents,
						amountBaseCents: base,
						service: l.service,
						subUnitId: l.subUnitId,
						source: "sync",
						externalId: `${conn.id}:${l.externalId}`,
					})
					.onConflictDoUpdate({
						target: [schema.costLines.workspaceId, schema.costLines.externalId],
						set: { amountCents: l.amountCents, amountBaseCents: base },
					});
				written++;
			}
		}

		if (c.fetchSnapshots) {
			const snaps = await c.fetchSnapshots(creds, range.to);
			for (const s of snaps) {
				const value =
					s.metric === "mrr_base_cents"
						? await convert(
								s.value,
								s.currency ?? ws.baseCurrency,
								ws.baseCurrency,
								s.date,
							)
						: s.value;
				await db
					.insert(schema.metricSnapshots)
					.values({
						workspaceId: ws.id,
						connectionId: conn.id,
						date: s.date,
						metric: s.metric,
						value,
					})
					.onConflictDoUpdate({
						target: [
							schema.metricSnapshots.connectionId,
							schema.metricSnapshots.date,
							schema.metricSnapshots.metric,
						],
						set: { value },
					});
				written++;
			}
		}

		await db
			.update(schema.connections)
			.set({ status: "active", lastSyncedAt: Date.now(), lastError: null })
			.where(eq(schema.connections.id, conn.id));
		await db
			.update(schema.syncRuns)
			.set({ finishedAt: Date.now(), status: "ok", linesWritten: written })
			.where(eq(schema.syncRuns.id, run.id));
		return { written };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		await db
			.update(schema.connections)
			.set({ status: "error", lastError: message })
			.where(eq(schema.connections.id, conn.id));
		await db
			.update(schema.syncRuns)
			.set({
				finishedAt: Date.now(),
				status: "error",
				error: message,
				linesWritten: written,
			})
			.where(eq(schema.syncRuns.id, run.id));
		throw err;
	}
}

// Product for a provider sub-unit, through the workspace's mappings.
async function productFor(conn: Connection, subUnitId?: string) {
	if (!subUnitId) return conn.productId;
	const m = await db.query.productMappings.findFirst({
		where: and(
			eq(schema.productMappings.connectionId, conn.id),
			eq(schema.productMappings.subUnitId, subUnitId),
		),
	});
	return m?.productId ?? conn.productId;
}

// Every active connection whose cadence has elapsed.
export async function dueConnections() {
	const now = Date.now();
	return db.query.connections.findMany({
		where: and(
			eq(schema.connections.status, "active"),
			or(
				sql`${schema.connections.lastSyncedAt} is null`,
				lte(
					sql`${schema.connections.lastSyncedAt} + ${schema.connections.cadenceMinutes} * 60000`,
					now,
				),
			),
		),
	});
}

export async function syncDue() {
	const due = await dueConnections();
	const touched = new Set<string>();
	for (const conn of due) {
		touched.add(conn.workspaceId);
		try {
			await syncConnection(conn);
		} catch (err) {
			console.error(`[sync] ${conn.provider} ${conn.id}:`, err);
		}
	}
	for (const workspaceId of touched) await evaluateAlerts(workspaceId);
	return due.length;
}
