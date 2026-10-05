import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { type ProductSeries, productSeries } from "./product.server";
import { currentWorkspace } from "./workspace.server";

export type PublicMode = "full" | "revenue" | "percent";

export type PublicProduct = {
	workspace: string;
	product: string;
	mode: PublicMode;
	series: ProductSeries;
};

// No auth: anyone with the link can read a product whose page is on.
export const getPublicProduct = createServerFn({ method: "GET" })
	.validator(z.object({ workspace: z.string(), product: z.string() }))
	.handler(async ({ data }): Promise<PublicProduct> => {
		const ws = await db.query.workspaces.findFirst({
			where: eq(schema.workspaces.slug, data.workspace),
		});
		if (!ws) throw notFound();
		const product = await db.query.products.findFirst({
			where: and(
				eq(schema.products.workspaceId, ws.id),
				eq(schema.products.slug, data.product),
			),
		});
		if (!product || product.publicPage === "off") throw notFound();
		return {
			workspace: ws.name,
			product: product.name,
			mode: product.publicPage,
			series: await productSeries(ws.id, ws.baseCurrency, product.id),
		};
	});

export const setPublicPage = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.string(),
			mode: z.enum(["off", "full", "revenue", "percent"]),
		}),
	)
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		await db
			.update(schema.products)
			.set({ publicPage: data.mode })
			.where(
				and(
					eq(schema.products.id, data.id),
					eq(schema.products.workspaceId, ws.id),
				),
			);
		const product = await db.query.products.findFirst({
			where: eq(schema.products.id, data.id),
		});
		return { slug: product?.slug ?? null, workspace: ws.slug };
	});
