import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { ACCOUNTS, type Account, accountName } from "#/lib/books";
import { providerName } from "#/lib/providers";
import { currentProduct, currentWorkspace } from "./workspace.server";

// What the export dialog (src/components/books/export.tsx) needs: products,
// the switcher's pick, closed months, and the accounts a QuickBooks or Xero
// file can name, with the user's names for them.
export const getJournalExport = createServerFn({ method: "GET" }).handler(
	async () => {
		const ws = await currentWorkspace();
		const [product, products, closed, conns] = await Promise.all([
			currentProduct(ws),
			db.query.products.findMany({
				where: eq(schema.products.workspaceId, ws.id),
				orderBy: (p, { asc }) => asc(p.createdAt),
			}),
			db.query.journalExports.findMany({
				where: eq(schema.journalExports.workspaceId, ws.id),
				columns: { month: true, exportedAt: true },
			}),
			db.query.connections.findMany({
				where: eq(schema.connections.workspaceId, ws.id),
				columns: { provider: true },
			}),
		]);
		// Not the company bank: those two formats leave it to the bank feed.
		const keys: Account[] = [
			...new Set(conns.map((c) => `balance:${c.provider}` as const)),
			...Object.keys(ACCOUNTS).filter((k) => k !== "company_bank"),
		] as Account[];
		return {
			products: products.map((p) => ({ id: p.id, name: p.name })),
			productId: product?.id ?? null,
			closed: Object.fromEntries(closed.map((c) => [c.month, c.exportedAt])),
			accounts: keys.map((key) => ({
				key,
				name: accountName(key, null, providerName),
			})),
			renames: ws.bookAccounts ?? {},
		};
	},
);

// Names (or Xero codes) for accounts. Blank keeps the default.
export const saveBookAccounts = createServerFn({ method: "POST" })
	.validator(z.record(z.string().max(64), z.string().max(100)))
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		const names = Object.fromEntries(
			Object.entries(data)
				.map(([k, v]) => [k, v.trim()])
				.filter(([, v]) => v),
		);
		await db
			.update(schema.workspaces)
			.set({ bookAccounts: names })
			.where(eq(schema.workspaces.id, ws.id));
		return { ok: true };
	});
