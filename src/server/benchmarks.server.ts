import { and, desc, eq, exists, gte, inArray, lt, sql } from "drizzle-orm";
import { db, schema } from "#/db";
import {
	ACTIVATION,
	AI_PROVIDERS,
	BANDS,
	type Band,
	bandFor,
	METRICS,
	type Metric,
	MIN_COHORT,
	percentile,
	type Snapshot,
	shown,
} from "#/lib/benchmarks";
import { convert } from "./fx.server";
import { flatMonthlyCents, lastMonths } from "./overview.server";
import type { Workspace } from "./workspace.server";

type Figures = { ws: string; band: Band } & Partial<Record<Metric, number>>;

const nextMonth = (m: string) => {
	const [y, mo] = m.split("-").map(Number);
	return new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
};

// One month's figures for each workspace in the benchmarks: sharing on, not
// the demo, a revenue connection and revenue that month. Revenue is in USD
// cents; ratios in percent of revenue, set only when the workspace had that
// kind of cost. `only` narrows it to one workspace.
async function figures(month: string, only?: string): Promise<Figures[]> {
	const from = `${month}-01`;
	const to = `${nextMonth(month)}-01`;
	// Base amounts convert to USD at the month's last ECB rate.
	const rateDay = new Date(Date.parse(to) - 86_400_000)
		.toISOString()
		.slice(0, 10);
	const { revenueLines: rl, costLines: cl, metricSnapshots: ms } = schema;
	const wss = await db
		.select({
			id: schema.workspaces.id,
			currency: schema.workspaces.baseCurrency,
		})
		.from(schema.workspaces)
		.where(
			and(
				eq(schema.workspaces.benchmarks, true),
				eq(schema.workspaces.demo, false),
				only ? eq(schema.workspaces.id, only) : undefined,
				exists(
					db
						.select({ id: schema.connections.id })
						.from(schema.connections)
						.where(
							and(
								eq(schema.connections.workspaceId, schema.workspaces.id),
								eq(schema.connections.kind, "revenue"),
							),
						),
				),
			),
		);
	if (!wss.length) return [];
	const ids = wss.map((w) => w.id);
	const [rev, cost, flats, mrr] = await Promise.all([
		db
			.select({ ws: rl.workspaceId, v: sql<number>`sum(${rl.netBaseCents})` })
			.from(rl)
			.where(
				and(inArray(rl.workspaceId, ids), gte(rl.date, from), lt(rl.date, to)),
			)
			.groupBy(rl.workspaceId),
		db
			.select({
				ws: cl.workspaceId,
				v: sql<number>`sum(${cl.amountBaseCents})`,
				ai: sql<number>`coalesce(sum(${cl.amountBaseCents}) filter (where ${inArray(cl.provider, AI_PROVIDERS)}), 0)`,
			})
			.from(cl)
			.where(
				and(inArray(cl.workspaceId, ids), gte(cl.date, from), lt(cl.date, to)),
			)
			.groupBy(cl.workspaceId),
		db.query.flatCosts.findMany({
			where: inArray(schema.flatCosts.workspaceId, ids),
		}),
		// Each connection's last MRR snapshot in the month.
		db
			.selectDistinctOn([ms.connectionId], { ws: ms.workspaceId, v: ms.value })
			.from(ms)
			.where(
				and(
					inArray(ms.workspaceId, ids),
					eq(ms.metric, "mrr_base_cents"),
					gte(ms.date, from),
					lt(ms.date, to),
				),
			)
			.orderBy(ms.connectionId, desc(ms.date)),
	]);
	const sum = (rows: { ws: string; v: number }[]) => {
		const m = new Map<string, number>();
		for (const r of rows) m.set(r.ws, (m.get(r.ws) ?? 0) + Number(r.v));
		return m;
	};
	const revM = sum(rev);
	const costM = sum(cost);
	const aiM = sum(cost.map((r) => ({ ws: r.ws, v: r.ai })));
	const flatM = sum(
		flats.map((f) => ({ ws: f.workspaceId, v: flatMonthlyCents(f, month) })),
	);
	const mrrM = sum(mrr);

	const out: Figures[] = [];
	for (const w of wss) {
		const r = revM.get(w.id) ?? 0;
		if (r <= 0) continue;
		const usd = (cents: number) => convert(cents, w.currency, "USD", rateDay);
		const synced = costM.get(w.id) ?? 0;
		const total = synced + (flatM.get(w.id) ?? 0);
		const ai = aiM.get(w.id) ?? 0;
		const revenue = await usd(r);
		const pct = (c: number) => (c ? (c / r) * 100 : undefined);
		out.push({
			ws: w.id,
			// MRR at the month's end; revenue when no connector reports MRR.
			band: bandFor(mrrM.get(w.id) ? await usd(mrrM.get(w.id) ?? 0) : revenue),
			revenue,
			gross_margin: synced ? ((r - synced) / r) * 100 : undefined,
			total_costs: pct(total),
			ai_costs: pct(ai),
		});
	}
	return out;
}

const round = (metric: Metric, v: number) =>
	metric === "revenue" ? Math.round(v) : Math.round(v * 10) / 10;

// Percentiles per band and metric for one month, default the last complete
// one. Writes nothing below ACTIVATION workspaces, and no cohort under
// MIN_COHORT. Rerunning a month replaces it.
export async function computeBenchmarks(month = lastMonths(2)[0]) {
	const rows = await figures(month);
	if (rows.length < ACTIVATION)
		return { month, workspaces: rows.length, cohorts: 0 };
	const computedAt = Date.now();
	const out: (typeof schema.benchmarkSnapshots.$inferInsert)[] = [];
	for (const band of BANDS) {
		for (const { key: metric } of METRICS) {
			const v = rows
				.filter((r) => r.band === band.key)
				.flatMap((r) => r[metric] ?? [])
				.sort((a, b) => a - b);
			if (v.length < MIN_COHORT) continue;
			const p = (q: number) => round(metric, percentile(v, q));
			out.push({
				month,
				band: band.key,
				metric,
				n: v.length,
				p25: p(0.25),
				p50: p(0.5),
				p75: p(0.75),
				p90: p(0.9),
				computedAt,
			});
		}
	}
	await db.transaction(async (tx) => {
		await tx
			.delete(schema.benchmarkSnapshots)
			.where(eq(schema.benchmarkSnapshots.month, month));
		if (out.length) await tx.insert(schema.benchmarkSnapshots).values(out);
	});
	return { month, workspaces: rows.length, cohorts: out.length };
}

// Every published row, newest month first, bands and metrics in display
// order.
export async function allSnapshots(): Promise<Snapshot[]> {
	const s = schema.benchmarkSnapshots;
	const rows = await db
		.select({
			month: s.month,
			band: s.band,
			metric: s.metric,
			n: s.n,
			p25: s.p25,
			p50: s.p50,
			p75: s.p75,
			p90: s.p90,
		})
		.from(s)
		.orderBy(desc(s.month));
	const bi = (b: string) => BANDS.findIndex((x) => x.key === b);
	const mi = (m: string) => METRICS.findIndex((x) => x.key === m);
	return rows
		.map(
			(r): Snapshot => ({
				...(r as Snapshot),
				p25: shown(r.n, 0.25) ? r.p25 : null,
				p75: shown(r.n, 0.75) ? r.p75 : null,
				p90: shown(r.n, 0.9) ? r.p90 : null,
			}),
		)
		.sort(
			(a, b) =>
				b.month.localeCompare(a.month) ||
				bi(a.band) - bi(b.band) ||
				mi(a.metric) - mi(b.metric),
		);
}

// A workspace's own figures for a published month, kept for an hour so the
// overview doesn't redo a month of sums on every load.
// ponytail: per-process map, one entry per workspace; fine at this scale.
const mine = new Map<string, { at: number; figures: Figures | undefined }>();

// The workspace's own figures for the latest published month next to its
// band's medians. Null when it opted out or its band has no data.
export async function myBenchmarks(ws: Workspace) {
	if (!ws.benchmarks || ws.demo) return null;
	const s = schema.benchmarkSnapshots;
	const [latest] = await db
		.select({ m: sql<string | null>`max(${s.month})` })
		.from(s);
	if (!latest?.m) return null;
	const month = latest.m;
	const key = `${ws.id}:${month}`;
	let cached = mine.get(key);
	if (!cached || Date.now() - cached.at > 60 * 60_000) {
		cached = { at: Date.now(), figures: (await figures(month, ws.id))[0] };
		mine.set(key, cached);
	}
	const me = cached.figures;
	if (!me) return null;
	const cohort = await db.query.benchmarkSnapshots.findMany({
		where: and(eq(s.month, month), eq(s.band, me.band)),
	});
	const items = METRICS.flatMap(({ key }) => {
		const own = me[key];
		const median = cohort.find((c) => c.metric === key)?.p50;
		return own === undefined || median === undefined
			? []
			: [{ metric: key, own: round(key, own), median }];
	});
	return items.length ? { month, band: me.band, items } : null;
}
