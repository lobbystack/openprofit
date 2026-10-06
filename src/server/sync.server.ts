import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { connector, connectors } from "#/connectors";
import type { Credentials } from "#/connectors/types";
import { db, schema } from "#/db";
import { decrypt } from "#/lib/crypto";
import { evaluateAlerts } from "./alerts.server";
import { isCloud } from "./billing.server";
import { convert } from "./fx.server";

type Connection = typeof schema.connections.$inferSelect;
type Workspace = typeof schema.workspaces.$inferSelect;

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) =>
	new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

// Days a full sync reads: two years, one on the free hosted plan.
const historyDays = (ws: Workspace) =>
	isCloud && ws.plan === "free" ? 365 : 730;

// Pull one connection. Lines are upserted by external id, so re-running a
// range is safe. `full` rereads the plan's whole history.
export async function syncConnection(
	conn: Connection,
	opts: { full?: boolean } = {},
) {
	const ws = await db.query.workspaces.findFirst({
		where: eq(schema.workspaces.id, conn.workspaceId),
	});
	if (!ws) throw new Error("workspace missing");
	const [run] = await db
		.insert(schema.syncRuns)
		.values({ connectionId: conn.id, startedAt: Date.now(), status: "running" })
		.returning();

	// First sync pulls the plan's history; later runs pull a short tail.
	const from = daysAgo(opts.full || !conn.lastSyncedAt ? historyDays(ws) : 3);
	const range = { from, to: today() };
	let written = 0;

	try {
		const c = connector(conn.provider);
		const creds = await decrypt<Credentials>(conn.credentials);
		const mappings = await db.query.productMappings.findMany({
			where: eq(schema.productMappings.connectionId, conn.id),
		});
		const mapped = new Map(mappings.map((m) => [m.subUnitId, m.productId]));
		const productFor = (subUnitId?: string) =>
			(subUnitId && mapped.get(subUnitId)) || conn.productId;

		if (c.fetchRevenue) {
			const lines = await c.fetchRevenue(creds, range);
			for (const l of lines) {
				const line = {
					productId: productFor(l.subUnitId),
					date: l.date,
					currency: l.currency,
					grossCents: l.grossCents,
					feesCents: l.feesCents,
					refundsCents: l.refundsCents,
					netCents: l.netCents,
					netBaseCents: await convert(
						l.netCents,
						l.currency,
						ws.baseCurrency,
						l.date,
					),
					kind: l.kind,
					subUnitId: l.subUnitId ?? null,
					subUnitLabel: l.subUnitLabel ?? null,
				};
				await db
					.insert(schema.revenueLines)
					.values({
						...line,
						workspaceId: ws.id,
						connectionId: conn.id,
						externalId: l.externalId,
					})
					.onConflictDoUpdate({
						target: [
							schema.revenueLines.connectionId,
							schema.revenueLines.externalId,
						],
						set: line,
					});
				written++;
			}
			await deleteMissing(
				schema.revenueLines,
				conn.id,
				range,
				new Set(lines.map((l) => l.externalId)),
			);
		}

		if (c.fetchCosts) {
			const lines = await c.fetchCosts(creds, range);
			for (const l of lines) {
				const line = {
					productId: productFor(l.subUnitId),
					date: l.date,
					currency: l.currency,
					amountCents: l.amountCents,
					amountBaseCents: await convert(
						l.amountCents,
						l.currency,
						ws.baseCurrency,
						l.date,
					),
					service: l.service ?? null,
					subUnitId: l.subUnitId ?? null,
					subUnitLabel: l.subUnitLabel ?? null,
				};
				await db
					.insert(schema.costLines)
					.values({
						...line,
						workspaceId: ws.id,
						connectionId: conn.id,
						provider: conn.provider,
						source: "sync",
						externalId: `${conn.id}:${l.externalId}`,
					})
					.onConflictDoUpdate({
						target: [schema.costLines.workspaceId, schema.costLines.externalId],
						set: line,
					});
				written++;
			}
			await deleteMissing(
				schema.costLines,
				conn.id,
				range,
				new Set(lines.map((l) => `${conn.id}:${l.externalId}`)),
			);
		}

		if (c.fetchSnapshots) {
			const snaps = await c.fetchSnapshots(creds, range.to);
			for (const s of snaps) {
				// `mrr_base_cents` arrives in the provider's currency; stored in base.
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

// Deletes the connection's synced lines that the provider no longer returns.
// Only lines dated inside [from, to] go, since the fetch covered those days
// in full. A monthly line is dated the 1st, so a range that starts mid-month
// never deletes it. Runs only after the whole range was fetched without error.
async function deleteMissing(
	table: typeof schema.revenueLines | typeof schema.costLines,
	connectionId: string,
	range: { from: string; to: string },
	keep: Set<string>,
) {
	const rows = await db
		.select({ id: table.id, externalId: table.externalId })
		.from(table)
		.where(
			and(
				eq(table.connectionId, connectionId),
				gte(table.date, range.from),
				lte(table.date, range.to),
			),
		);
	const gone = rows.filter((r) => !keep.has(r.externalId)).map((r) => r.id);
	for (let i = 0; i < gone.length; i += 1000)
		await db.delete(table).where(inArray(table.id, gone.slice(i, i + 1000)));
}

// When an errored connection may retry: 1h after its last attempt, doubling
// with each consecutive failure, capped at 24h.
async function retryAt(connectionId: string) {
	const runs = await db
		.select({ status: schema.syncRuns.status, at: schema.syncRuns.startedAt })
		.from(schema.syncRuns)
		.where(eq(schema.syncRuns.connectionId, connectionId))
		.orderBy(desc(schema.syncRuns.startedAt))
		.limit(6);
	const ok = runs.findIndex((r) => r.status === "ok");
	const failures = ok === -1 ? runs.length : ok;
	const hours = Math.min(2 ** Math.max(failures - 1, 0), 24);
	return (runs[0]?.at ?? 0) + hours * 3_600_000;
}

// Active connections whose cadence has elapsed, and errored ones whose
// backoff has. Providers without a registered connector are skipped.
export async function dueConnections() {
	const now = Date.now();
	const conns = await db.query.connections.findMany({
		where: and(
			inArray(
				schema.connections.provider,
				connectors().map((c) => c.id),
			),
			or(
				eq(schema.connections.status, "error"),
				and(
					eq(schema.connections.status, "active"),
					or(
						sql`${schema.connections.lastSyncedAt} is null`,
						lte(
							sql`${schema.connections.lastSyncedAt} + ${schema.connections.cadenceMinutes} * 60000`,
							now,
						),
					),
				),
			),
		),
	});
	const due: Connection[] = [];
	for (const c of conns)
		if (c.status !== "error" || (await retryAt(c.id)) <= now) due.push(c);
	return due;
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
