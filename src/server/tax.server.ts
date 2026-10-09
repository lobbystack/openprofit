import { eq, min } from "drizzle-orm";
import { db, schema } from "#/db";
import { type Entry, journal } from "#/lib/books";
import { providerName } from "#/lib/providers";
import {
	amounts,
	balances,
	deMinimisElection,
	depreciation,
	type Equipment,
	equipmentOf,
	type Form,
	form1120,
	gifi100,
	gifi125,
	profitAndLoss,
	SCHEDULE_L_LIMIT,
	scheduleC,
	scheduleL,
	t2125,
	total,
	tp80,
} from "#/lib/tax";
import { booksInput, yearDepreciation } from "./books.server";
import type { Workspace } from "./workspace.server";

// The yearly tax report (docs/BOOKS.md "Tax report"): the journal's totals
// for the calendar year on the lines of the form the workspace files.
//
// A workspace incorporated during the year gets two parts, split at the
// incorporation date: before it, the founder's own business (T2125 or
// Schedule C); from it, the company's (GIFI or Form 1120). Both come from
// the same journal entries, cut by date, which is simpler than a second
// report and is what the two returns need. Depreciation is booked on
// December 31, so the year's depreciation lands in the company's part, as
// if the equipment moved to the company on the day it was formed.

// Where each provider's invoices are, for the reminder to keep them. From
// each provider's billing docs (read 2026-10-07). Polar, Twilio and
// MongoDB Atlas need an account id, so they open the dashboard; OpenRouter
// documents no invoice page, so it opens credits. Polar, Paddle and Lemon
// Squeezy issue an invoice per payout.
const INVOICES: Record<string, string> = {
	stripe: "https://dashboard.stripe.com/settings/plans-and-fees/plans",
	polar: "https://polar.sh/dashboard",
	paddle: "https://vendors.paddle.com/payouts/sent",
	lemonsqueezy: "https://app.lemonsqueezy.com/settings/payouts",
	revenuecat: "https://app.revenuecat.com/settings/billing/invoices",
	openai: "https://platform.openai.com/account/billing",
	anthropic: "https://platform.claude.com/settings/billing",
	openrouter: "https://openrouter.ai/settings/credits",
	vercel: "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fbilling",
	cloudflare: "https://dash.cloudflare.com/?to=/:account/billing",
	railway: "https://railway.com/workspace/billing",
	digitalocean: "https://cloud.digitalocean.com/account/billing",
	github: "https://github.com/settings/billing",
	twilio: "https://console.twilio.com/",
	firecrawl: "https://www.firecrawl.dev/app/settings?tab=billing",
	xai: "https://console.x.ai/team/default/billing/invoices",
	neon: "https://console.neon.tech/app/billing",
	mongodb: "https://cloud.mongodb.com/",
	resend: "https://resend.com/settings/billing",
	supabase: "https://supabase.com/dashboard/org/_/billing#invoices",
};

const nextMonth = (m: string) => {
	const [y, mo] = m.split("-").map(Number);
	return new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
};
const dayBefore = (d: string) =>
	new Date(Date.parse(d) - 86_400_000).toISOString().slice(0, 10);

// Net debit by account.
export function byAccount(entries: Entry[]) {
	const t: Record<string, number> = {};
	for (const e of entries)
		for (const l of e.lines)
			t[l.account] = (t[l.account] ?? 0) + l.debit - l.credit;
	return t;
}

// The workspace's first month with data, or null.
async function firstMonth(ws: Workspace) {
	const r = schema.revenueLines;
	const c = schema.costLines;
	const f = schema.flatCosts;
	const p = schema.payouts;
	const found = await Promise.all([
		db
			.select({ d: min(r.date) })
			.from(r)
			.where(eq(r.workspaceId, ws.id)),
		db
			.select({ d: min(c.date) })
			.from(c)
			.where(eq(c.workspaceId, ws.id)),
		db
			.select({ d: min(f.startsOn) })
			.from(f)
			.where(eq(f.workspaceId, ws.id)),
		db
			.select({ d: min(p.date) })
			.from(p)
			.where(eq(p.workspaceId, ws.id)),
	]);
	const days = found.map((x) => x[0]?.d).filter((d): d is string => !!d);
	return days.length ? days.sort()[0].slice(0, 7) : null;
}

export async function taxReport(ws: Workspace, year: number) {
	const [first, conns] = await Promise.all([
		firstMonth(ws),
		db.query.connections.findMany({
			where: eq(schema.connections.workspaceId, ws.id),
			columns: { provider: true },
		}),
	]);
	const now = new Date().getUTCFullYear();
	const from = Math.min(first ? Number(first.slice(0, 4)) : now, year);
	const years = Array.from(
		{ length: Math.max(now, year) - from + 1 },
		(_, i) => Math.max(now, year) - i,
	);
	const invoices = [...new Set(conns.map((c) => c.provider))]
		.filter((p) => INVOICES[p])
		.map((p) => ({ name: providerName(p), url: INVOICES[p] }));
	const base = {
		year,
		years,
		country: ws.country,
		region: ws.region,
		currency: ws.baseCurrency,
		invoices,
	};
	if (!ws.country) return { ...base, parts: [] };

	const start = `${year}-01-01`;
	const end = `${year}-12-31`;
	const inc =
		ws.incorporatedOn && ws.incorporatedOn <= end ? ws.incorporatedOn : null;

	// A company's balance sheet adds up everything since the first month.
	const entries: Entry[] = [];
	let equipment: Equipment[] = [];
	for (
		let m = inc && first && first < `${year}-01` ? first : `${year}-01`;
		m <= `${year}-12`;
		m = nextMonth(m)
	) {
		const input = await booksInput(ws, m);
		if (m === `${year}-12`) equipment = equipmentOf(input.manual);
		entries.push(
			...journal({ ...input, depreciation: yearDepreciation(ws, input) }),
		);
	}
	const rows = depreciation(ws.country, ws.incorporatedOn, equipment, year);
	const between = (a: string, b: string) =>
		entries.filter((e) => e.date >= a && e.date <= b);

	const cuts: [string, string, boolean][] =
		inc && inc > start
			? [
					[start, dayBefore(inc), false],
					[inc, end, true],
				]
			: [[start, end, Boolean(inc)]];

	const parts = cuts.map(([from, to, incorporated]) => {
		const t = byAccount(between(from, to));
		// The depreciation entry is dated December 31.
		const dep = to === end ? rows : [];
		const a = amounts(t, total(dep.filter((r) => r.deMinimis)));
		const b =
			incorporated && inc
				? balances(
						byAccount(between("", to)),
						amounts(byAccount(between(inc, to))).profit,
					)
				: null;
		const forms: Form[] = [];
		let note: string | null = null;
		if (ws.country === "CA" && !incorporated) {
			forms.push(t2125(a));
			if (ws.region === "QC") forms.push(tp80(a));
		} else if (ws.country === "CA" && b) {
			forms.push(gifi125(a), gifi100(b));
			if (ws.region === "QC")
				note = "In Québec, attach the same GIFI schedules to the CO-17.";
		} else if (ws.country === "US" && !incorporated) {
			forms.push(scheduleC(a));
		} else if (ws.country === "US" && b) {
			forms.push(form1120(a));
			if (a.sales >= SCHEDULE_L_LIMIT || b.assets >= SCHEDULE_L_LIMIT)
				forms.push(scheduleL(b));
			else
				note =
					"Receipts and total assets are under $250,000, so you can skip Schedule L (Schedule K, question 13).";
		} else forms.push(profitAndLoss(a));
		return {
			from,
			to,
			incorporated,
			income: a.income,
			expenses: a.expenses,
			profit: a.profit,
			forms,
			note,
			depreciation: dep,
			election:
				ws.country === "US" && dep.some((r) => r.deMinimis)
					? deMinimisElection(year)
					: null,
		};
	});
	return { ...base, parts };
}
