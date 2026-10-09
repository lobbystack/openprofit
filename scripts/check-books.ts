// Checks the journal rules in src/lib/books.ts (docs/BOOKS.md).
// Run: npx tsx scripts/check-books.ts
import assert from "node:assert/strict";
import {
	adjustments,
	balanced,
	type BooksIn,
	type Entry,
	journal,
	summarize,
	totals,
} from "../src/lib/books";

const base: Omit<BooksIn, "month"> = {
	incorporatedOn: null,
	providerName: (id) => id,
	revenue: [],
	costs: [],
	payouts: [],
	manual: [],
};
const sum = (es: Entry[], account: string) =>
	es.flatMap((e) => e.lines).filter((l) => l.account === account)
		.reduce((a, l) => a + l.debit - l.credit, 0);
const allBalanced = (es: Entry[]) => es.every(balanced);

// A monthly plan paid Dec 15 for Dec 15 to Jan 15 splits by days, and the two
// months add up to the gross.
const monthly = {
	date: "2025-12-15",
	provider: "stripe",
	productId: "p1",
	gross: 3100,
	fees: 120,
	refunds: 0,
	tax: 465,
	remitsTax: false,
	serviceStart: "2025-12-15",
	serviceEnd: "2026-01-15",
};
const dec = journal({ ...base, month: "2025-12", revenue: [monthly] });
const jan = journal({ ...base, month: "2026-01", revenue: [monthly] });
assert(allBalanced(dec) && allBalanced(jan));
assert.equal(-sum(dec, "sales") - sum(jan, "sales"), 3100);
assert.equal(-sum(dec, "sales"), 1700); // 17 of 31 days
assert.equal(sum(dec, "balance:stripe"), 3100 - 120 + 465);
assert.equal(-sum(dec, "sales_tax_owed"), 465);

// An annual plan earns over 12 months and adds up exactly.
const annual = { ...monthly, gross: 100_000, tax: 0, serviceStart: "2026-01-01", serviceEnd: "2027-01-01", date: "2026-01-01" };
let earned = 0;
for (let m = 1; m <= 12; m++) {
	const es = journal({ ...base, month: `2026-${String(m).padStart(2, "0")}`, revenue: [annual] });
	assert(allBalanced(es));
	earned += -sum(es, "sales");
}
assert.equal(earned, 100_000);

// A merchant of record files the tax: none in the books.
const mor = journal({ ...base, month: "2025-12", revenue: [{ ...monthly, provider: "polar", remitsTax: true, serviceStart: null, serviceEnd: null }] });
assert.equal(sum(mor, "sales_tax_owed"), 0);
assert.equal(-sum(mor, "sales"), 3100);

// Who paid: owner contributions before incorporation, the founder after
// (personal card), the company bank once the card moved to the company.
const cost = (date: string) => ({ date, provider: "openai", productId: "p1", amount: 2200, method: "company" as const, since: "2026-03-01" });
const run = (date: string) => journal({ ...base, month: date.slice(0, 7), incorporatedOn: "2026-02-01", costs: [cost(date)] });
assert.equal(-sum(run("2026-01-10"), "owner_contributions"), 2200);
assert.equal(-sum(run("2026-02-10"), "owed_to_founder"), 2200);
const company = run("2026-03-10");
assert.equal(-sum(company, "company_bank"), 2200);
assert.equal(sum(company, "ai_apis"), 2200);
assert(company.some((e) => e.bank) && company.some((e) => !e.bank));
assert(allBalanced(company));

// Payouts: to the company bank once incorporated, owner draws before.
const payout = (date: string) => journal({ ...base, month: date.slice(0, 7), incorporatedOn: "2026-02-01", payouts: [{ date, provider: "stripe", amount: 9000 }] });
assert.equal(sum(payout("2026-01-20"), "owner_draws"), 9000);
assert.equal(sum(payout("2026-02-20"), "company_bank"), 9000);
assert(payout("2026-02-20")[0].bank);

// Manual costs: a laptop is equipment, a yearly cost is a twelfth a month.
const manual = journal({
	...base,
	month: "2026-04",
	manual: [
		{ name: "Laptop", productId: null, amount: 250_000, interval: "once", startsOn: "2026-04-03", endsOn: null, category: "equipment", method: "personal", since: null },
		{ name: "Domain", productId: "p1", amount: 1200, interval: "year", startsOn: "2026-01-01", endsOn: null, category: "software", method: "personal", since: null },
	],
});
assert.equal(sum(manual, "equipment"), 250_000);
assert.equal(sum(manual, "software"), 100);
assert(allBalanced(manual));

// The summary keeps every entry balanced.
assert(summarize([...dec, ...company], "2025-12").every(balanced));

// A closed month that changed later goes out as one balanced adjustment,
// without the bank side for formats that leave it to the bank feed.
const before = totals(company);
const after = totals(run("2026-03-10").concat(journal({ ...base, month: "2026-03", incorporatedOn: "2026-02-01", costs: [{ ...cost("2026-03-20"), amount: 500 }] })));
const adj = adjustments(before, after, "2026-04-01", "2026-03");
assert(adj.length === 2 && adj.every(balanced));
const book = adj.find((e) => !e.bank);
assert.equal(book?.lines.find((l) => l.account === "ai_apis")?.debit, 500);
assert(!book?.lines.some((l) => l.account === "company_bank"));
assert(adj.find((e) => e.bank)?.lines.some((l) => l.account === "company_bank"));
assert.equal(adjustments(before, before, "2026-04-01", "2026-03").length, 0);

console.log("books: ok");
