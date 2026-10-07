import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { FlatCostInput } from "#/lib/costs";
import { flatValues } from "./costs.server";
import { currentWorkspace } from "./workspace.server";

export type FlatCostRow = {
	id: string;
	name: string;
	productId: string | null;
	product: string | null;
	// Source currency, whole units.
	amount: number;
	currency: string;
	interval: "month" | "year";
	startsOn: string;
	endsOn: string | null;
};

export const getFlatCosts = createServerFn({ method: "GET" }).handler(
	async (): Promise<{
		flats: FlatCostRow[];
		products: { id: string; name: string }[];
	}> => {
		const ws = await currentWorkspace();
		const [flats, products] = await Promise.all([
			db.query.flatCosts.findMany({
				where: eq(schema.flatCosts.workspaceId, ws.id),
				orderBy: (f, { desc }) => desc(f.amountCents),
			}),
			db.query.products.findMany({
				where: eq(schema.products.workspaceId, ws.id),
				orderBy: (p, { asc }) => asc(p.createdAt),
			}),
		]);
		const names = new Map(products.map((p) => [p.id, p.name]));
		return {
			flats: flats.map((f) => ({
				id: f.id,
				name: f.name,
				productId: f.productId,
				product: f.productId ? (names.get(f.productId) ?? null) : null,
				amount: f.amountCents / 100,
				currency: f.currency,
				interval: f.interval,
				startsOn: f.startsOn,
				endsOn: f.endsOn,
			})),
			products: products.map((p) => ({ id: p.id, name: p.name })),
		};
	},
);

export const createFlatCost = createServerFn({ method: "POST" })
	.validator(FlatCostInput)
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		const [row] = await db
			.insert(schema.flatCosts)
			.values({ workspaceId: ws.id, ...(await flatValues(ws, data)) })
			.returning({ id: schema.flatCosts.id });
		return { id: row.id };
	});

export const updateFlatCost = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string(), cost: FlatCostInput }))
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		await db
			.update(schema.flatCosts)
			.set(await flatValues(ws, data.cost))
			.where(
				and(
					eq(schema.flatCosts.id, data.id),
					eq(schema.flatCosts.workspaceId, ws.id),
				),
			);
		return { ok: true };
	});

export const deleteFlatCost = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		await db
			.delete(schema.flatCosts)
			.where(
				and(
					eq(schema.flatCosts.id, data.id),
					eq(schema.flatCosts.workspaceId, ws.id),
				),
			);
		return { ok: true };
	});
