import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db, schema } from "#/db";

const day = (offset: number) =>
	new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

type Finding = {
	key: string;
	ruleId: string;
	title: string;
	detail: string;
	tone: "negative" | "pending" | "ink";
};

// Evaluates every enabled rule for a workspace. Opens alerts for new
// findings and resolves the ones whose condition cleared.
export async function evaluateAlerts(workspaceId: string) {
	const rules = await db.query.alertRules.findMany({
		where: and(
			eq(schema.alertRules.workspaceId, workspaceId),
			eq(schema.alertRules.enabled, true),
		),
	});
	const findings: Finding[] = [];
	for (const rule of rules) {
		if (rule.kind === "cost_spike")
			findings.push(...(await costSpikes(workspaceId, rule)));
		if (rule.kind === "margin_floor")
			findings.push(...(await marginFloors(workspaceId, rule)));
		if (rule.kind === "sync_failure")
			findings.push(...(await syncFailures(workspaceId, rule)));
	}

	const open = await db.query.alerts.findMany({
		where: and(
			eq(schema.alerts.workspaceId, workspaceId),
			isNull(schema.alerts.resolvedAt),
		),
	});
	const openByTitle = new Map(open.map((a) => [a.title, a]));
	const now = Date.now();

	for (const f of findings) {
		const existing = openByTitle.get(f.title);
		if (existing) {
			if (existing.detail !== f.detail) {
				await db
					.update(schema.alerts)
					.set({ detail: f.detail })
					.where(eq(schema.alerts.id, existing.id));
			}
			openByTitle.delete(f.title);
			continue;
		}
		await db.insert(schema.alerts).values({
			workspaceId,
			ruleId: f.ruleId,
			title: f.title,
			detail: f.detail,
			tone: f.tone,
			openedAt: now,
		});
	}
	// Whatever is still open and not found again has cleared.
	for (const stale of openByTitle.values()) {
		await db
			.update(schema.alerts)
			.set({ resolvedAt: now })
			.where(eq(schema.alerts.id, stale.id));
	}
	return findings.length;
}

type Rule = typeof schema.alertRules.$inferSelect;

const money = (cents: number) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(cents / 100);

// Yesterday's spend per provider against the previous seven-day average.
async function costSpikes(workspaceId: string, rule: Rule): Promise<Finding[]> {
	const threshold = rule.threshold ?? 1;
	const rows = await db
		.select({
			provider: schema.costLines.provider,
			date: schema.costLines.date,
			v: sql<number>`sum(${schema.costLines.amountBaseCents})`,
		})
		.from(schema.costLines)
		.where(
			and(
				eq(schema.costLines.workspaceId, workspaceId),
				eq(schema.costLines.source, "sync"),
				gte(schema.costLines.date, day(8)),
			),
		)
		.groupBy(schema.costLines.provider, schema.costLines.date);
	const byProvider = new Map<string, Map<string, number>>();
	for (const r of rows) {
		const m = byProvider.get(r.provider) ?? new Map();
		m.set(r.date, Number(r.v));
		byProvider.set(r.provider, m);
	}
	const out: Finding[] = [];
	const yesterday = day(1);
	for (const [provider, days] of byProvider) {
		const y = days.get(yesterday) ?? 0;
		const prior = [2, 3, 4, 5, 6, 7, 8].map((i) => days.get(day(i)) ?? 0);
		const avg = prior.reduce((a, b) => a + b, 0) / prior.length;
		if (avg > 0 && y >= 500 && y > avg * (1 + threshold)) {
			const name = provider[0].toUpperCase() + provider.slice(1);
			out.push({
				key: `spike:${provider}`,
				ruleId: rule.id,
				title: `${name} spend ${Math.round(y / avg)}x the weekly average`,
				detail: `${money(y)} yesterday vs ${money(avg)} average`,
				tone: "negative",
			});
		}
	}
	return out;
}

// Seven-day margin per product under the floor.
async function marginFloors(
	workspaceId: string,
	rule: Rule,
): Promise<Finding[]> {
	const floor = rule.threshold ?? 0.6;
	const from = day(7);
	const [rev, cost, products] = await Promise.all([
		db
			.select({
				productId: schema.revenueLines.productId,
				v: sql<number>`sum(${schema.revenueLines.netBaseCents})`,
			})
			.from(schema.revenueLines)
			.where(
				and(
					eq(schema.revenueLines.workspaceId, workspaceId),
					gte(schema.revenueLines.date, from),
				),
			)
			.groupBy(schema.revenueLines.productId),
		db
			.select({
				productId: schema.costLines.productId,
				v: sql<number>`sum(${schema.costLines.amountBaseCents})`,
			})
			.from(schema.costLines)
			.where(
				and(
					eq(schema.costLines.workspaceId, workspaceId),
					gte(schema.costLines.date, from),
				),
			)
			.groupBy(schema.costLines.productId),
		db.query.products.findMany({
			where: eq(schema.products.workspaceId, workspaceId),
		}),
	]);
	const r = new Map(rev.map((x) => [x.productId, Number(x.v)]));
	const c = new Map(cost.map((x) => [x.productId, Number(x.v)]));
	const out: Finding[] = [];
	for (const p of products) {
		const revenue = r.get(p.id) ?? 0;
		if (revenue < 1000) continue;
		const margin = (revenue - (c.get(p.id) ?? 0)) / revenue;
		if (margin < floor) {
			out.push({
				key: `margin:${p.id}`,
				ruleId: rule.id,
				title: `${p.name} margin below ${Math.round(floor * 100)}%`,
				detail: `${Math.round(margin * 100)}% over the last 7 days`,
				tone: "pending",
			});
		}
	}
	return out;
}

async function syncFailures(
	workspaceId: string,
	rule: Rule,
): Promise<Finding[]> {
	const failed = await db.query.connections.findMany({
		where: and(
			eq(schema.connections.workspaceId, workspaceId),
			eq(schema.connections.status, "error"),
		),
	});
	return failed.map((c) => ({
		key: `sync:${c.id}`,
		ruleId: rule.id,
		title: `${c.provider[0].toUpperCase() + c.provider.slice(1)} sync failed`,
		detail: c.lastError ?? "",
		tone: "ink",
	}));
}
