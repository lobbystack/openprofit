// Checks month closing and adjustments in src/server/books.server.ts on a
// scratch database. Run: DATABASE_URL=/tmp/books-check SYNC_SCHEDULER=off npx tsx scripts/check-books-close.ts
import assert from "node:assert/strict";
const { db, schema } = await import("../src/db/index.ts");
const { exportJournal } = await import("../src/server/books.server.ts");
const { balanced } = await import("../src/lib/books.ts");
const [ws] = await db.insert(schema.workspaces).values({ name: "T", slug: "t", baseCurrency: "USD", incorporatedOn: "2026-01-01" }).returning();
const conn = async (provider: string, kind: "revenue" | "cost", extra = {}) => (await db.insert(schema.connections).values({ workspaceId: ws.id, provider, kind, authKind: "key", credentials: "x", ...extra }).returning())[0];
const stripe = await conn("stripe", "revenue"), openai = await conn("openai", "cost", { paidWith: "company" });
await db.insert(schema.revenueLines).values({ workspaceId: ws.id, connectionId: stripe.id, date: "2026-09-15", currency: "USD", grossCents: 3000, feesCents: 120, netCents: 2880, netBaseCents: 2880, grossBaseCents: 3000, feesBaseCents: 120, refundsBaseCents: 0, serviceStart: "2026-09-15", serviceEnd: "2026-10-15", externalId: "ch_1" });
const cost = (date: string, cents: number, ext: string) => ({ workspaceId: ws.id, connectionId: openai.id, provider: "openai", date, currency: "USD", amountCents: cents, amountBaseCents: cents, source: "sync" as const, externalId: ext });
await db.insert(schema.costLines).values(cost("2026-09-10", 2200, "o1"));
await db.insert(schema.payouts).values({ workspaceId: ws.id, connectionId: stripe.id, date: "2026-09-20", currency: "USD", amountCents: 2880, amountBaseCents: 2880, externalId: "po_1" });

const sep = await exportJournal(ws, "2026-09", { withBank: true });
assert(sep.every(balanced) && sep.some((e) => e.bank));
const sepQb = await exportJournal(ws, "2026-09", { withBank: false });
assert(!sepQb.some((e) => e.bank) && sepQb.length < sep.length);
// A late OpenAI line for September, after September was exported.
await db.insert(schema.costLines).values(cost("2026-09-28", 500, "o2"));
assert.deepEqual(await exportJournal(ws, "2026-09", { withBank: true }), sep); // same file again
const oct = await exportJournal(ws, "2026-10", { withBank: true });
const adj = oct.filter((e) => e.group === "adjust:2026-09");
assert(adj.length === 2 && adj.every(balanced));
assert.equal(adj.find((e) => !e.bank)?.lines.find((l) => l.account === "ai_apis")?.debit, 500);
// October also earns the rest of the September payment.
assert(oct.some((e) => e.group === "earn:stripe"));
// Exporting November doesn't repeat the September adjustment.
const nov = await exportJournal(ws, "2026-11", { withBank: true });
assert(!nov.some((e) => e.group === "adjust:2026-09"));
console.log("close: ok");
process.exit(0);
