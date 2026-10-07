import { and, eq } from "drizzle-orm";
import { db, schema } from "#/db";
import type { Workspace } from "./workspace.server";

const slugify = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 40) || "product";

// A new product with a slug unique in the workspace.
export async function addProduct(ws: Workspace, name: string) {
	const base = slugify(name);
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
		.values({ workspaceId: ws.id, name, slug })
		.returning();
	return p;
}
