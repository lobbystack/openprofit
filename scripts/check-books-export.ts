// Checks the journal files in src/server/books-export.server.ts on a scratch
// database. Run: DATABASE_URL=/tmp/books-export-check SYNC_SCHEDULER=off npx tsx scripts/check-books-export.ts
import assert from "node:assert/strict";
const { db, schema } = await import("../src/db/index.ts");
const { journalCsv } = await import("../src/server/books-export.server.ts");
const [ws] = await db.insert(schema.workspaces).values({ name: "T", slug: "t", baseCurrency: "USD", incorporatedOn: "2026-01-01", country: "US",
	bookAccounts: { sales: "Sales income", "balance:stripe": "Stripe clearing", "xero:tracking": "Products", "xero:tax_rate": "Tax Exempt" } }).returning();
const [alpha, beta] = await db.insert(schema.products).values([{ workspaceId: ws.id, name: "Alpha", slug: "alpha" }, { workspaceId: ws.id, name: "Beta, Inc", slug: "beta" }]).returning();
const conn = async (provider: string, kind: "revenue" | "cost", extra = {}) => (await db.insert(schema.connections).values({ workspaceId: ws.id, provider, kind, authKind: "key", credentials: "x", ...extra }).returning())[0];
const stripe = await conn("stripe", "revenue"), openai = await conn("openai", "cost", { paidWith: "company" });
const pay = (productId: string, cents: number, ext: string) => ({ workspaceId: ws.id, connectionId: stripe.id, productId, date: "2026-09-15", currency: "USD", grossCents: cents, feesCents: 100, netCents: cents - 100, netBaseCents: cents - 100, grossBaseCents: cents, feesBaseCents: 100, refundsBaseCents: 0, serviceStart: "2026-09-15", serviceEnd: "2026-10-15", externalId: ext });
await db.insert(schema.revenueLines).values([pay(alpha.id, 3000, "ch_1"), pay(beta.id, 5000, "ch_2")]);
await db.insert(schema.costLines).values({ workspaceId: ws.id, connectionId: openai.id, provider: "openai", productId: alpha.id, date: "2026-09-10", currency: "USD", amountCents: 2200, amountBaseCents: 2200, source: "sync", externalId: "o1" });
await db.insert(schema.payouts).values({ workspaceId: ws.id, connectionId: stripe.id, date: "2026-09-20", currency: "USD", amountCents: 7800, amountBaseCents: 7800, externalId: "po_1" });
await db.insert(schema.flatCosts).values({ workspaceId: ws.id, provider: "manual", name: "=Domain", amountCents: 1200, currency: "USD", interval: "month", startsOn: "2026-01-01" });

// RFC 4180, after the BOM.
function parse(text: string) {
	assert(text.startsWith("﻿"));
	const rows: string[][] = [[]];
	let cell = "", quoted = false;
	for (let i = 1; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
			else if (c === '"') quoted = false;
			else cell += c;
		} else if (c === '"') quoted = true;
		else if (c === ",") rows.at(-1)?.push(cell), (cell = "");
		else if (c === "\r") {
			rows.at(-1)?.push(cell), (cell = "");
			rows.push([]), i++;
		} else cell += c;
	}
	rows.pop();
	const [head, ...body] = rows;
	return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const cents = (s: string) => (s ? Math.round(Number(s) * 100) : 0);
const file = async (format: "quickbooks" | "xero" | "plain", product: string | null = null) => {
	const out = await journalCsv(ws, "2026-09", format, product);
	assert("csv" in out, JSON.stringify(out));
	return parse(out.csv);
};
type Row = Record<string, string>;
const bank = (r: Row) => /payout|paid by the company/.test(r.Description);
const groupBy = (rows: Row[], key: (r: Row) => string) => {
	const out = new Map<string, Row[]>();
	for (const r of rows) out.set(key(r), [...(out.get(key(r)) ?? []), r]);
	return out;
};

const qb = await file("quickbooks");
const byNo = groupBy(qb, (r) => r["Journal No."]);
assert(byNo.size > 1);
for (const rows of byNo.values()) {
	assert.equal(new Set(rows.map((r) => r.Description)).size, 1); // one entry per number
	assert.equal(rows.reduce((a, r) => a + cents(r.Debits) - cents(r.Credits), 0), 0);
}
assert(!qb.some(bank) && !qb.some((r) => r["Account Name"] === "Company bank"));
assert(qb.every((r) => r["Journal Date"] === "09/30/2026"));
assert.deepEqual(new Set(qb.map((r) => r.Class)), new Set(["Alpha", "Beta, Inc", ""]));
assert(qb.some((r) => r["Account Name"] === "Sales income") && qb.some((r) => r["Account Name"] === "Stripe clearing"));
assert(qb.some((r) => r.Description === "'=Domain")); // CSV injection escaped

const xero = await file("xero");
const journals: Row[][] = [];
for (const r of xero) r["*Narration"] ? journals.push([r]) : journals.at(-1)?.push(r);
assert.equal(journals.length, byNo.size);
for (const j of journals) {
	assert(j[0]["*Date"] === "30 Sep 2026" && j.slice(1).every((r) => !r["*Narration"] && !r["*Date"]));
	assert.equal(j.reduce((a, r) => a + cents(r["*Amount"]), 0), 0);
}
assert(!xero.some(bank));
assert(xero.every((r) => r["*TaxRate"] === "Tax Exempt"));
assert(xero.every((r) => (r.TrackingOption1 ? r.TrackingName1 === "Products" : !r.TrackingName1)));
assert.deepEqual(new Set(xero.map((r) => r.TrackingOption1)), new Set(["Alpha", "Beta, Inc", ""]));
assert(xero.some((r) => r["*AccountCode"] === "Sales income"));

const plain = await file("plain");
for (const rows of groupBy(plain, (r) => `${r.Date}|${r.Description}`).values())
	assert.equal(rows.reduce((a, r) => a + cents(r.Debit) - cents(r.Credit), 0), 0);
assert(plain.some(bank) && plain.some((r) => r.Account === "Company bank"));
assert(plain.some((r) => r.Account === "Sales") && !plain.some((r) => r.Account === "Sales income")); // OpenProfit's names
assert.equal(plain.find((r) => r.Description === "Stripe payout")?.Debit, "78.00");

// One product: its lines only, and September stays closed once.
const one = await file("plain", alpha.id);
assert(one.every((r) => r.Product === "Alpha" || r.Product === ""));
assert.equal((await db.query.journalExports.findMany()).length, 1);
assert("error" in (await journalCsv(ws, new Date().toISOString().slice(0, 7), "plain", null)));
assert("error" in (await journalCsv(ws, "2026-09", "plain", "nope")));
console.log("export: ok");
process.exit(0);
