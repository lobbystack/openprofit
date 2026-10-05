import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db, schema } from "#/db";
import { currentWorkspace } from "./workspace.server";

export type FlatCostRow = {
	id: string;
	name: string;
	provider: string;
	product: string | null;
	amount: number;
	currency: string;
	interval: "month" | "year";
};

export const getFlatCosts = createServerFn({ method: "GET" }).handler(
	async (): Promise<FlatCostRow[]> => {
		const ws = await currentWorkspace();
		const [flats, products] = await Promise.all([
			db.query.flatCosts.findMany({
				where: eq(schema.flatCosts.workspaceId, ws.id),
				orderBy: (f, { desc }) => desc(f.amountCents),
			}),
			db.query.products.findMany({
				where: eq(schema.products.workspaceId, ws.id),
			}),
		]);
		const names = new Map(products.map((p) => [p.id, p.name]));
		return flats.map((f) => ({
			id: f.id,
			name: f.name,
			provider: f.provider,
			product: f.productId ? (names.get(f.productId) ?? null) : null,
			amount: f.amountCents / 100,
			currency: f.currency,
			interval: f.interval,
		}));
	},
);
