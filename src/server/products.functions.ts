import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { currentWorkspace } from "./workspace.server";

const slugify = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 40) || "product";

export const createProduct = createServerFn({ method: "POST" })
	.inputValidator(z.object({ name: z.string().trim().min(1).max(60) }))
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		const base = slugify(data.name);
		let slug = base;
		for (let i = 2; ; i++) {
			const taken = await db.query.products.findFirst({
				where: and(
					eq(schema.products.workspaceId, ws.id),
					eq(schema.products.slug, slug),
				),
			});
			if (!taken) break;
			slug = `${base}-${i}`;
		}
		const [p] = await db
			.insert(schema.products)
			.values({ workspaceId: ws.id, name: data.name, slug })
			.returning();
		return { id: p.id };
	});

export const deleteProduct = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		await db
			.delete(schema.products)
			.where(
				and(
					eq(schema.products.id, data.id),
					eq(schema.products.workspaceId, ws.id),
				),
			);
		return { ok: true };
	});
