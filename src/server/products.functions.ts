import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { capture } from "./analytics.server";
import { requireUser } from "./auth.server";
import { addProduct } from "./products.server";
import { currentWorkspace } from "./workspace.server";

export const createProduct = createServerFn({ method: "POST" })
	.validator(z.object({ name: z.string().trim().min(1).max(60) }))
	.handler(async ({ data }) => {
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		const p = await addProduct(ws, data.name);
		await capture(user.id, ws.id, "product_created");
		return { id: p.id };
	});

export const deleteProduct = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		const removed = await db
			.delete(schema.products)
			.where(
				and(
					eq(schema.products.id, data.id),
					eq(schema.products.workspaceId, ws.id),
				),
			)
			.returning({ id: schema.products.id });
		if (removed.length) await capture(user.id, ws.id, "product_removed");
		return { ok: true };
	});
