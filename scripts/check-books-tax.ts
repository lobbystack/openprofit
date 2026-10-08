// Checks the tax report (src/server/tax.server.ts, src/lib/tax.ts) on a scratch
// database. Run: DATABASE_URL=/tmp/books-tax-check SYNC_SCHEDULER=off npx tsx scripts/check-books-tax.ts
import assert from "node:assert/strict";

const R = "../src";
const { db, schema } = await import(`${R}/db/index.ts`);
const { yearEntries } = await import(`${R}/server/books.server.ts`);
const { taxReport, byAccount } = await import(`${R}/server/tax.server.ts`);
const { depreciation, amounts } = await import(`${R}/lib/tax.ts`);
const { balanced } = await import(`${R}/lib/books.ts`);

type WsOpts = { country: string; region?: string; incorporatedOn?: string; big?: boolean };
let n = 0;
async function seed(o: WsOpts) {
	const slug = `t${n++}`;
	const [ws] = await db
		.insert(schema.workspaces)
		.values({ name: slug, slug, baseCurrency: o.country === "CA" ? "CAD" : "USD", country: o.country, region: o.region ?? null, incorporatedOn: o.incorporatedOn ?? null })
		.returning();
	const conn = async (provider: string, kind: "revenue" | "cost", extra = {}) =>
		(await db.insert(schema.connections).values({ workspaceId: ws.id, provider, kind, authKind: "key", credentials: "x", ...extra }).returning())[0];
	const stripe = await conn("stripe", "revenue");
	const openai = await conn("openai", "cost", { paidWith: "company" });
	const vercel = await conn("vercel", "cost");
	let i = 0;
	const rev = (date: string, gross: number, fees: number, refunds = 0, svc?: [string, string]) => ({
		workspaceId: ws.id, connectionId: stripe.id, date, currency: ws.baseCurrency,
		grossCents: gross, feesCents: fees, refundsCents: refunds, netCents: gross - fees - refunds, netBaseCents: gross - fees - refunds,
		grossBaseCents: gross, feesBaseCents: fees, refundsBaseCents: refunds, taxCents: 0, taxBaseCents: 0,
		serviceStart: svc?.[0] ?? null, serviceEnd: svc?.[1] ?? null, externalId: `ch_${i++}`,
	});
	const lines = [
		// A monthly plan from December 2024 into January 2025, earned by days.
		rev("2024-12-15", 3100, 120, 0, ["2024-12-15", "2025-01-15"]),
		rev("2025-02-10", 50_000, 1_480),
		rev("2025-05-20", 20_000, 610, 5_000),
		// An annual plan paid in July: half earned in 2025, half deferred.
		rev("2025-07-01", 120_000, 3_510, 0, ["2025-07-01", "2026-07-01"]),
		rev("2025-11-03", o.big ? 30_000_000 : 9_900, 320),
	];
	await db.insert(schema.revenueLines).values(lines);
	const cost = (c: { id: string; provider: string }, date: string, cents: number) => ({
		workspaceId: ws.id, connectionId: c.id, provider: c.provider, date, currency: ws.baseCurrency,
		amountCents: cents, amountBaseCents: cents, source: "sync" as const, externalId: `c_${i++}`,
	});
	await db.insert(schema.costLines).values([
		cost(openai, "2025-01-31", 4_200), cost(openai, "2025-06-30", 8_800), cost(openai, "2025-12-31", 6_100),
		cost(vercel, "2025-03-31", 2_000), cost(vercel, "2025-09-30", 2_000),
	]);
	const flat = (name: string, amount: number, interval: "month" | "year" | "once", startsOn: string, category: string) => ({
		workspaceId: ws.id, provider: "manual", name, amountCents: amount, amountBaseCents: amount, currency: ws.baseCurrency, interval, startsOn, category,
	});
	await db.insert(schema.flatCosts).values([
		flat("Linear", 1_000, "month", "2025-01-01", "software"),
		flat("Domain", 2_400, "year", "2025-01-01", "software"),
		flat("Designer", 150_000, "once", "2025-04-15", "contractors"),
		flat("Laptop 2000", 200_000, "once", "2025-03-10", "equipment"),
		flat("Laptop 3000", 300_000, "once", "2025-06-01", "equipment"),
	]);
	await db.insert(schema.payouts).values({ workspaceId: ws.id, connectionId: stripe.id, date: "2025-08-01", currency: ws.baseCurrency, amountCents: 100_000, amountBaseCents: 100_000, externalId: "po_1" });
	return ws;
}

const ACC_EXP = ["payment_fees", "ai_apis", "hosting", "email", "software", "contractors", "other", "depreciation"];
async function check(label: string, o: WsOpts) {
	const ws = await seed(o);
	const rep = await taxReport(ws, 2025);
	const journal = await yearEntries(ws, 2025);
	assert(journal.every(balanced), `${label}: journal balanced`);
	const t = byAccount(journal);
	const income = -(t.sales ?? 0) - (t.refunds ?? 0);
	const expenses = ACC_EXP.reduce((a, k) => a + (t[k] ?? 0), 0);
	// Totals across the report's parts equal the journal's.
	const sum = (k: "income" | "expenses" | "profit") => rep.parts.reduce((a, p) => a + p[k], 0);
	assert.equal(sum("income"), income, `${label}: income`);
	assert.equal(sum("expenses"), expenses, `${label}: expenses`);
	assert.equal(sum("profit"), income - expenses, `${label}: profit`);
	for (const p of rep.parts) {
		assert.equal(p.profit, p.income - p.expenses, `${label}: part profit`);
		for (const f of p.forms) {
			// Every line that groups accounts adds up its items.
			for (const l of f.lines) if (l.items?.length) assert.equal(l.items.reduce((a, x) => a + x.amount, 0), l.amount, `${label} ${f.name} ${l.line}: items`);
		}
	}
	// December carries the year's depreciation.
	const dep = rep.parts.flatMap((p) => p.depreciation).reduce((a, r) => a + r.amount, 0);
	assert.equal(t.depreciation ?? 0, dep, `${label}: December depreciation`);
	console.log(`\n== ${label}: income ${income}, expenses ${expenses}, profit ${income - expenses}`);
	for (const p of rep.parts) {
		console.log(`  part ${p.from}..${p.to} incorporated=${p.incorporated}${p.note ? ` note: ${p.note}` : ""}`);
		for (const f of p.forms) {
			console.log(`   ${f.name}`);
			for (const l of f.lines) console.log(`     ${(l.line ?? "").padEnd(5)} ${l.name.padEnd(60)} ${l.amount}${l.ours ? "  [ours]" : ""}`);
		}
		for (const r of p.depreciation) console.log(`   dep: ${r.name} ${r.cost} ${r.rule} -> ${r.amount} (left ${r.left})`);
		if (p.election) console.log(`   election:\n${p.election.replace(/^/gm, "     ")}`);
	}
	return { ws, rep, t };
}

const line = (rep: Awaited<ReturnType<typeof taxReport>>, form: string, n: string, part = 0) =>
	rep.parts[part].forms.find((f) => f.name.startsWith(form))?.lines.find((l) => l.line === n)?.amount;

// Canada, Québec, not incorporated: T2125 and TP-80.
const qc = await check("CA QC", { country: "CA", region: "QC" });
assert.deepEqual(qc.rep.parts[0].forms.map((f) => f.name), ["T2125", "TP-80-V"]);
// Laptops bought in 2025: 100% the first year (class 50, factor 9/11).
assert.deepEqual(qc.rep.parts[0].depreciation.map((r) => r.amount), [200_000, 300_000]);
assert.equal(line(qc.rep, "T2125", "9936"), 500_000);
assert.equal(line(qc.rep, "TP-80", "240"), 500_000);
assert.equal(line(qc.rep, "T2125", "8000"), line(qc.rep, "TP-80", "130"));
assert.equal(line(qc.rep, "T2125", "9369"), qc.rep.parts[0].profit);
assert.equal(line(qc.rep, "TP-80", "250"), qc.rep.parts[0].profit);

// Canada, incorporated before the year: GIFI 125 and 100.
const ca = await check("CA inc", { country: "CA", region: "ON", incorporatedOn: "2024-01-01" });
assert.deepEqual(ca.rep.parts[0].forms.map((f) => f.name), ["GIFI, Schedule 125", "GIFI, Schedule 100, end of year"]);
assert.equal(line(ca.rep, "GIFI, Schedule 100", "2599"), line(ca.rep, "GIFI, Schedule 100", "3640"));
assert.equal(line(ca.rep, "GIFI, Schedule 125", "9970"), ca.rep.parts[0].profit);

// Canada, incorporated mid-year: two parts, CCA prorated by the company's
// first year (184 of 365 days).
const split = await check("CA split", { country: "CA", region: "QC", incorporatedOn: "2025-07-01" });
assert.equal(split.rep.parts.length, 2);
assert.deepEqual(split.rep.parts[0].forms.map((f) => f.name), ["T2125", "TP-80-V"]);
assert.equal(split.rep.parts[0].to, "2025-06-30");
assert.deepEqual(split.rep.parts[1].forms.map((f) => f.name), ["GIFI, Schedule 125", "GIFI, Schedule 100, end of year"]);
assert.match(split.rep.parts[1].note ?? "", /CO-17/);
assert.equal(split.rep.parts[1].depreciation[0].amount, Math.round((200_000 * 184) / 365));
assert.equal(line(split.rep, "GIFI, Schedule 100", "2599", 1), line(split.rep, "GIFI, Schedule 100", "3640", 1));

// US, not incorporated: Schedule C. The $2,000 laptop under the de minimis
// safe harbor in Part V, the $3,000 one at 100% special allowance on line 13.
const us = await check("US", { country: "US" });
assert.deepEqual(us.rep.parts[0].depreciation.map((r) => [r.amount, r.deMinimis]), [[200_000, true], [300_000, false]]);
assert.equal(line(us.rep, "Schedule C", "13"), 300_000);
const other = us.rep.parts[0].forms[0].lines.find((l) => l.line === "27b");
assert(other?.items?.some((x) => x.amount === 200_000));
assert.equal(line(us.rep, "Schedule C", "11"), 150_000);
assert.equal(line(us.rep, "Schedule C", "29"), us.rep.parts[0].profit);
assert.match(us.rep.parts[0].election ?? "", /Section 1\.263\(a\)-1\(f\) de minimis safe harbor election/);

// US, incorporated: Form 1120; Schedule L only from $250,000.
const usc = await check("US inc", { country: "US", incorporatedOn: "2024-06-01" });
assert.deepEqual(usc.rep.parts[0].forms.map((f) => f.name), ["Form 1120"]);
assert.match(usc.rep.parts[0].note ?? "", /250,000/);
assert.equal(line(usc.rep, "Form 1120", "20"), 300_000);
assert.equal(line(usc.rep, "Form 1120", "28"), usc.rep.parts[0].profit);
const big = await check("US inc big", { country: "US", incorporatedOn: "2024-06-01", big: true });
assert.deepEqual(big.rep.parts[0].forms.map((f) => f.name), ["Form 1120", "Schedule L (Form 1120), end of year"]);
assert.equal(line(big.rep, "Schedule L", "15"), line(big.rep, "Schedule L", "28"));

// Elsewhere: a plain profit and loss, no depreciation.
const fr = await check("FR", { country: "FR" });
assert.deepEqual(fr.rep.parts[0].forms.map((f) => f.name), ["Profit and loss"]);
assert.equal(fr.rep.parts[0].depreciation.length, 0);

// No country: nothing to map.
const none = await seed({ country: "" as string });
assert.equal((await taxReport({ ...none, country: null }, 2025)).parts.length, 0);

// The rules on their own: declining balance and the dates around them.
const one = (country: string, date: string, cost: number, y: number, inc: string | null = null) =>
	depreciation(country, inc, [{ name: "x", date, cost }], y)[0]?.amount ?? 0;
assert.equal(one("CA", "2024-02-01", 200_000, 2024), 110_000); // in use 2024, before April 16: 55%, no half-year rule
assert.equal(one("CA", "2024-02-01", 200_000, 2025), 49_500); // 55% of the 90,000 left
assert.equal(one("CA", "2023-05-01", 200_000, 2023), 165_000); // 1.5 x 55%
assert.equal(one("CA", "2034-03-01", 200_000, 2034), 55_000); // half-year rule
assert.equal(one("CA", "2025-03-10", 300_000, 2026), 0); // fully deducted in 2025
assert.equal(one("US", "2025-01-10", 300_000, 2025), 156_000); // 40% + 20% of the rest
assert.equal(one("US", "2025-01-10", 300_000, 2026), 57_600); // 32% of the 180,000 rest
assert.equal(one("US", "2025-03-10", 300_000, 2026), 0);
assert.equal(one("US", "2024-03-10", 200_000, 2025), 0); // de minimis in 2024 only
assert.equal(amounts({ sales: -1000, refunds: 100, ai_apis: 300 }).profit, 600);

console.log("\ntax: ok");
process.exit(0);
