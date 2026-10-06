import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { authSchema, db, schema } from "#/db";
import { RULE_NAMES } from "#/lib/alerts";
import { describeError } from "#/lib/errors";
import { providerName } from "#/lib/providers";
import { sendEmail } from "./email.server";
import type { Workspace } from "./workspace.server";

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
// findings, emails the members once per new alert, and resolves the alerts
// whose condition cleared.
export async function evaluateAlerts(workspaceId: string) {
	const [rules, ws] = await Promise.all([
		db.query.alertRules.findMany({
			where: and(
				eq(schema.alertRules.workspaceId, workspaceId),
				eq(schema.alertRules.enabled, true),
			),
		}),
		db.query.workspaces.findFirst({
			where: eq(schema.workspaces.id, workspaceId),
		}),
	]);
	if (!ws) return 0;
	const findings: Finding[] = [];
	for (const rule of rules) {
		if (rule.kind === "cost_spike")
			findings.push(...(await costSpikes(ws, rule)));
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
	const openByKey = new Map(
		open.filter((a) => a.key).map((a) => [a.key as string, a]),
	);
	// Alerts opened before alerts had keys can't be matched to a finding by
	// key. They resolve here, and a finding for the same rule whose title
	// starts with the same word (the provider or product) reopens without an
	// email, so the change doesn't send a second email for the same thing.
	const legacy = open.filter((a) => !a.key);
	const head = (title: string) => title.split(" ")[0].toLowerCase();
	const quiet = new Set(legacy.map((a) => `${a.ruleId}:${head(a.title)}`));
	const now = Date.now();
	const opened: Finding[] = [];

	for (const f of findings) {
		const existing = openByKey.get(f.key);
		if (existing) {
			if (existing.detail !== f.detail || existing.title !== f.title) {
				await db
					.update(schema.alerts)
					.set({ title: f.title, detail: f.detail })
					.where(eq(schema.alerts.id, existing.id));
			}
			openByKey.delete(f.key);
			continue;
		}
		// The partial unique index on (workspace, key) while open makes a
		// concurrent evaluation's insert a no-op, so only one of them emails.
		const inserted = await db
			.insert(schema.alerts)
			.values({
				workspaceId,
				ruleId: f.ruleId,
				key: f.key,
				title: f.title,
				detail: f.detail,
				tone: f.tone,
				openedAt: now,
			})
			.onConflictDoNothing()
			.returning({ id: schema.alerts.id });
		if (inserted.length && !quiet.has(`${f.ruleId}:${head(f.title)}`))
			opened.push(f);
	}
	// Whatever is still open and not found again has cleared.
	for (const stale of [...openByKey.values(), ...legacy]) {
		await db
			.update(schema.alerts)
			.set({ resolvedAt: now })
			.where(eq(schema.alerts.id, stale.id));
	}
	if (opened.length)
		await emailAlerts(ws, rules, opened).catch((err) =>
			console.error(`[alerts] email for workspace ${workspaceId} failed:`, err),
		);
	return findings.length;
}

// One email per new alert to every member of the workspace.
async function emailAlerts(ws: Workspace, rules: Rule[], opened: Finding[]) {
	const members = await db
		.select({ email: authSchema.user.email })
		.from(schema.workspaceMembers)
		.innerJoin(
			authSchema.user,
			eq(authSchema.user.id, schema.workspaceMembers.userId),
		)
		.where(eq(schema.workspaceMembers.workspaceId, ws.id));
	const kinds = new Map(rules.map((r) => [r.id, r.kind]));
	const url = process.env.APP_URL ?? "";
	for (const f of opened) {
		const kind = kinds.get(f.ruleId);
		const rule = kind ? RULE_NAMES[kind] : "alert";
		const text = [
			f.title,
			f.detail,
			"",
			`See it in OpenProfit: ${url}/app/alerts`,
			"",
			`You get this email because the ${rule} rule is on in ${ws.name}. To stop these alerts, turn the rule off on the Alerts page.`,
		].join("\n");
		for (const m of members)
			await sendEmail(m.email, `${ws.name}: ${f.title}`, text).catch((err) =>
				console.error(`[alerts] email to a member of ${ws.id} failed:`, err),
			);
	}
	console.info(
		`[alerts] emailed ${opened.length} alert(s) to ${members.length} member(s)`,
	);
}

type Rule = typeof schema.alertRules.$inferSelect;

const money = (cents: number, currency: string) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(cents / 100);

// Yesterday's spend per provider against the previous seven-day average.
async function costSpikes(ws: Workspace, rule: Rule): Promise<Finding[]> {
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
				eq(schema.costLines.workspaceId, ws.id),
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
			const name = providerName(provider);
			out.push({
				key: `spike:${provider}`,
				ruleId: rule.id,
				title: `${name} spend at ${Math.round((y / avg) * 10) / 10}x its daily average`,
				detail: `${money(y, ws.baseCurrency)} yesterday, against ${money(avg, ws.baseCurrency)} a day over the 7 days before`,
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
		title: `${providerName(c.provider)} sync failed`,
		detail: describeError(providerName(c.provider), c.lastError ?? "").text,
		tone: "ink",
	}));
}
