import { and, eq, gte, isNull, lt, or, sql } from "drizzle-orm";
import { authSchema, db, schema } from "#/db";
import { sendEmail } from "./email.server";

const day = (offset: number) =>
	new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

const fmt = (cents: number, currency: string) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(cents / 100);

// Last seven days against the seven before, plus the cost that moved most.
export async function weeklySummary(workspaceId: string) {
	const ws = await db.query.workspaces.findFirst({
		where: eq(schema.workspaces.id, workspaceId),
	});
	if (!ws) return null;
	const sum = async (from: string, to: string) => {
		const [r, c] = await Promise.all([
			db
				.select({
					v: sql<number>`coalesce(sum(${schema.revenueLines.netBaseCents}), 0)`,
				})
				.from(schema.revenueLines)
				.where(
					and(
						eq(schema.revenueLines.workspaceId, workspaceId),
						gte(schema.revenueLines.date, from),
						lt(schema.revenueLines.date, to),
					),
				),
			db
				.select({
					provider: schema.costLines.provider,
					v: sql<number>`coalesce(sum(${schema.costLines.amountBaseCents}), 0)`,
				})
				.from(schema.costLines)
				.where(
					and(
						eq(schema.costLines.workspaceId, workspaceId),
						gte(schema.costLines.date, from),
						lt(schema.costLines.date, to),
					),
				)
				.groupBy(schema.costLines.provider),
		]);
		const costs = new Map(c.map((x) => [x.provider, Number(x.v)]));
		let total = 0;
		for (const v of costs.values()) total += v;
		return { revenue: Number(r[0]?.v ?? 0), costs: total, byProvider: costs };
	};
	const [week, prior] = await Promise.all([
		sum(day(7), day(0)),
		sum(day(14), day(7)),
	]);

	let mover: { provider: string; delta: number; pct: number } | null = null;
	for (const [provider, v] of week.byProvider) {
		const before = prior.byProvider.get(provider) ?? 0;
		const delta = v - before;
		if (!mover || Math.abs(delta) > Math.abs(mover.delta)) {
			mover = { provider, delta, pct: before ? (delta / before) * 100 : 100 };
		}
	}

	const cur = ws.baseCurrency;
	const profit = week.revenue - week.costs;
	const lines = [
		`Last week, ${ws.name}`,
		"",
		`Revenue  ${fmt(week.revenue, cur)}`,
		`Costs    ${fmt(week.costs, cur)}`,
		`Profit   ${fmt(profit, cur)}`,
	];
	if (mover && Math.abs(mover.delta) >= 500) {
		const name = mover.provider[0].toUpperCase() + mover.provider.slice(1);
		lines.push(
			"",
			`Biggest change: ${name}, ${mover.delta > 0 ? "up" : "down"} ${Math.abs(Math.round(mover.pct))}% (${fmt(Math.abs(mover.delta), cur)}).`,
		);
	}
	lines.push("", `${process.env.APP_URL ?? ""}/app`);
	return {
		subject: `${ws.name}: ${fmt(profit, cur)} profit last week`,
		text: lines.join("\n"),
	};
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Day (0 = Sunday) and hour of `at` in an IANA time zone.
export function localSlot(at: Date, timeZone: string) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		weekday: "short",
		hour: "numeric",
		hourCycle: "h23",
	}).formatToParts(at);
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
	return { day: WEEKDAYS.indexOf(get("weekday")), hour: Number(get("hour")) };
}

// Runs hourly. Sends to each workspace whose chosen day and hour, in its
// time zone, is now. The claim update makes a second run in the same week,
// or on another instance, skip it.
export async function sendWeeklyEmails(now = new Date()) {
	const workspaces = await db.query.workspaces.findMany({
		where: eq(schema.workspaces.weeklyEmail, true),
	});
	const weekAgo = now.getTime() - 6 * 86_400_000;
	let sent = 0;
	for (const ws of workspaces) {
		const slot = localSlot(now, ws.timezone);
		if (slot.day !== ws.weeklyDay || slot.hour !== ws.weeklyHour) continue;
		const claimed = await db
			.update(schema.workspaces)
			.set({ weeklySentAt: now.getTime() })
			.where(
				and(
					eq(schema.workspaces.id, ws.id),
					or(
						isNull(schema.workspaces.weeklySentAt),
						lt(schema.workspaces.weeklySentAt, weekAgo),
					),
				),
			)
			.returning({ id: schema.workspaces.id });
		if (!claimed.length) continue;
		const summary = await weeklySummary(ws.id);
		if (!summary) continue;
		const members = await db
			.select({ email: authSchema.user.email })
			.from(schema.workspaceMembers)
			.innerJoin(
				authSchema.user,
				eq(authSchema.user.id, schema.workspaceMembers.userId),
			)
			.where(eq(schema.workspaceMembers.workspaceId, ws.id));
		for (const m of members) {
			await sendEmail(m.email, summary.subject, summary.text);
			sent++;
		}
	}
	if (sent) console.info(`[weekly] email sent to ${sent} member(s)`);
	return sent;
}
