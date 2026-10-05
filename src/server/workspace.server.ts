import { db, type schema } from "#/db";

// Until auth lands, every request works on the first workspace.
export async function currentWorkspace() {
	const ws = await db.query.workspaces.findFirst({
		orderBy: (w, { asc }) => asc(w.createdAt),
	});
	if (!ws) throw new Error("No workspace. Run `pnpm db:seed`.");
	return ws;
}

export type Workspace = typeof schema.workspaces.$inferSelect;
