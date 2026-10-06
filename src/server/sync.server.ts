import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { connector, connectors } from "#/connectors";
import {
	ConnectorError,
	type Credentials,
	type Snapshot,
	type SyncRange,
} from "#/connectors/types";
import { db, schema } from "#/db";
import { decrypt } from "#/lib/crypto";
import { evaluateAlerts } from "./alerts.server";
import { isCloud } from "./billing.server";
import { convert } from "./fx.server";
import { traced } from "./observability.server";

type Connection = typeof schema.connections.$inferSelect;
type Workspace = typeof schema.workspaces.$inferSelect;

// Days a full sync reads: two years, one on the free hosted plan.
const historyDays = (ws: Workspace) =>
	isCloud && ws.plan === "free" ? 365 : 730;

const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// The range a sync reads. A first or full sync reads the plan's history. A
// regular sync rereads 3 days before the last successful one, so an outage
// is covered once the provider is back; never more than the plan's history.
export function syncRange(
	lastSyncedAt: number | null,
	days: number,
	full = false,
	now = Date.now(),
) {
	const oldest = now - days * DAY;
	const from =
		full || !lastSyncedAt
			? oldest
			: Math.max(Math.min(now, lastSyncedAt) - 3 * DAY, oldest);
	return { from: isoDay(from), to: isoDay(now) };
}

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

	const range = syncRange(conn.lastSyncedAt, historyDays(ws), opts.full);
	// A paused connection stays paused; Sync now still runs it.
	const paused = conn.status === "paused";
	let written = 0;

	try {
		const c = connector(conn.provider);
		const creds = await decrypt<Credentials>(conn.credentials);
		const window = deletionWindow(range, c.historyDays);
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
					taxCents: l.taxCents ?? 0,
					taxBaseCents: await convert(
						l.taxCents ?? 0,
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
				window,
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
				window,
				new Set(lines.map((l) => `${conn.id}:${l.externalId}`)),
			);
		}

		if (c.fetchSnapshots) {
			// Snapshots of one metric and day add up; `mrr_base_cents` arrives
			// per currency and is converted to base before summing.
			const sums = new Map<string, Snapshot>();
			for (const s of await c.fetchSnapshots(creds, range.to)) {
				const value =
					s.metric === "mrr_base_cents"
						? await convert(
								s.value,
								s.currency ?? ws.baseCurrency,
								ws.baseCurrency,
								s.date,
							)
						: s.value;
				const key = `${s.date}:${s.metric}`;
				const sum = sums.get(key);
				if (sum) sum.value += value;
				else sums.set(key, { date: s.date, metric: s.metric, value });
			}
			for (const { date, metric, value } of sums.values()) {
				await db
					.insert(schema.metricSnapshots)
					.values({
						workspaceId: ws.id,
						connectionId: conn.id,
						date,
						metric,
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
			.set({
				status: paused ? "paused" : "active",
				lastSyncedAt: Date.now(),
				lastError: null,
			})
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
			.set({ status: paused ? "paused" : "error", lastError: message })
			.where(eq(schema.connections.id, conn.id));
		await db
			.update(schema.syncRuns)
			.set({
				finishedAt: Date.now(),
				status:
					err instanceof ConnectorError && err.auth ? "auth_error" : "error",
				error: message,
				linesWritten: written,
			})
			.where(eq(schema.syncRuns.id, run.id));
		throw err;
	}
}

// The days whose stored lines a fetch can delete: the sync range, cut to the
// connector's complete history. Null when the connector never deletes.
function deletionWindow(range: SyncRange, days?: number) {
	if (days === 0) return null;
	if (days === undefined) return range;
	const from = isoDay(Date.now() - days * DAY);
	return { from: from > range.from ? from : range.from, to: range.to };
}

// Deletes the connection's synced lines that the provider no longer returns,
// dated inside the window. A monthly line is dated the 1st, so a window that
// starts mid-month never deletes it. Runs only after the whole range was
// fetched without error. A fetch that returned nothing deletes nothing: an
// empty answer is more often a provider hiccup than every line going away,
// and the next fetch with lines cleans up.
async function deleteMissing(
	table: typeof schema.revenueLines | typeof schema.costLines,
	connectionId: string,
	window: SyncRange | null,
	keep: Set<string>,
) {
	if (!window || !keep.size || window.from > window.to) return;
	const rows = await db
		.select({ id: table.id, externalId: table.externalId })
		.from(table)
		.where(
			and(
				eq(table.connectionId, connectionId),
				gte(table.date, window.from),
				lte(table.date, window.to),
			),
		);
	const gone = rows.filter((r) => !keep.has(r.externalId)).map((r) => r.id);
	for (let i = 0; i < gone.length; i += 1000)
		await db.delete(table).where(inArray(table.id, gone.slice(i, i + 1000)));
}

// When an errored connection may retry, from its latest runs (newest first):
// 1h after the last attempt, doubling with each consecutive failure, capped
// at 24h. Never, when the provider rejected the key: the user fixes it and
// clicks Sync now.
export function retryAt(runs: { status: string; at: number }[]) {
	if (runs[0]?.status === "auth_error") return Number.POSITIVE_INFINITY;
	const ok = runs.findIndex((r) => r.status === "ok");
	const failures = ok === -1 ? runs.length : ok;
	const hours = Math.min(2 ** Math.max(failures - 1, 0), 24);
	return (runs[0]?.at ?? 0) + hours * 3_600_000;
}

// The latest 6 runs of each connection, newest first, in one query.
export async function latestRuns(ids: string[]) {
	const byConn = new Map<string, { status: string; at: number }[]>();
	if (!ids.length) return byConn;
	const ranked = db
		.select({
			connectionId: schema.syncRuns.connectionId,
			status: schema.syncRuns.status,
			at: schema.syncRuns.startedAt,
			n: sql<number>`row_number() over (partition by ${schema.syncRuns.connectionId} order by ${schema.syncRuns.startedAt} desc)`.as(
				"n",
			),
		})
		.from(schema.syncRuns)
		.where(inArray(schema.syncRuns.connectionId, ids))
		.as("ranked");
	const rows = await db
		.select()
		.from(ranked)
		.where(lte(ranked.n, 6))
		.orderBy(ranked.connectionId, desc(ranked.at));
	for (const r of rows) {
		const list = byConn.get(r.connectionId) ?? [];
		list.push({ status: r.status, at: Number(r.at) });
		byConn.set(r.connectionId, list);
	}
	return byConn;
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
	const runs = await latestRuns(
		conns.filter((c) => c.status === "error").map((c) => c.id),
	);
	return conns.filter(
		(c) => c.status !== "error" || retryAt(runs.get(c.id) ?? []) <= now,
	);
}

export async function syncDue() {
	const due = await dueConnections();
	const touched = new Set<string>();
	for (const conn of due) {
		touched.add(conn.workspaceId);
		try {
			await traced(`sync ${conn.provider}`, { "connection.id": conn.id }, () =>
				syncConnection(conn),
			);
		} catch (err) {
			console.error(`[sync] ${conn.provider} ${conn.id}:`, err);
		}
	}
	for (const workspaceId of touched) await evaluateAlerts(workspaceId);
	return due.length;
}
