import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { CURRENCIES } from "#/lib/format";
import { demoWorkspace } from "./demo.server";
import { convert } from "./fx.server";
import { currentWorkspace, type Workspace } from "./workspace.server";

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

type FlatCosts = {
	flats: FlatCostRow[];
	products: { id: string; name: string }[];
};

// `demo` reads the public demo workspace instead of the user's.
export const getFlatCosts = createServerFn({ method: "GET" })
	.validator(z.object({ demo: z.boolean() }).optional())
	.handler(async ({ data }): Promise<FlatCosts> => {
		const ws = data?.demo ? await demoWorkspace() : await currentWorkspace();
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
	});

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const FlatCostInput = z
	.object({
		name: z.string().trim().min(1).max(80),
		amountCents: z.number().int().positive().max(100_000_000),
		currency: z.enum(CURRENCIES),
		interval: z.enum(["month", "year"]),
		startsOn: Day,
		endsOn: Day.nullable(),
		productId: z.string().nullable(),
	})
	.refine((f) => !f.endsOn || f.endsOn >= f.startsOn, {
		message: "The end date is before the start date.",
	});

// The values to store, with the amount in the base currency at today's rate.
// ponytail: every month of a flat cost uses this one rate, and saving the
// cost reprices its past months; convert per month from fx_rates at read
// time if foreign-currency flat costs need exact history.
async function flatValues(ws: Workspace, f: z.infer<typeof FlatCostInput>) {
	if (f.productId) {
		const product = await db.query.products.findFirst({
			where: and(
				eq(schema.products.id, f.productId),
				eq(schema.products.workspaceId, ws.id),
			),
		});
		if (!product) throw new Error("That product no longer exists.");
	}
	const today = new Date().toISOString().slice(0, 10);
	const amountBaseCents = await convert(
		f.amountCents,
		f.currency,
		ws.baseCurrency,
		today,
	).catch(() => {
		throw new Error(
			`Couldn't get today's ${f.currency} to ${ws.baseCurrency} rate. Try again in a minute.`,
		);
	});
	return {
		name: f.name,
		amountCents: f.amountCents,
		amountBaseCents,
		currency: f.currency,
		interval: f.interval,
		startsOn: f.startsOn,
		endsOn: f.endsOn,
		productId: f.productId,
	};
}

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
