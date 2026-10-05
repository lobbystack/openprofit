import { redirect } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db, schema } from "#/db";
import { requireUser } from "./auth.server";

export type Workspace = typeof schema.workspaces.$inferSelect;

// The signed-in user's workspace, or a redirect to onboarding when they
// don't have one yet.
export async function currentWorkspace(): Promise<Workspace> {
	const user = await requireUser();
	const member = await db.query.workspaceMembers.findFirst({
		where: eq(schema.workspaceMembers.userId, user.id),
		orderBy: (m, { asc }) => asc(m.createdAt),
	});
	if (!member) throw redirect({ to: "/onboarding" });
	const ws = await db.query.workspaces.findFirst({
		where: eq(schema.workspaces.id, member.workspaceId),
	});
	if (!ws) throw redirect({ to: "/onboarding" });
	return ws;
}

const slugify = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
		.slice(0, 40) || "workspace";

export async function createWorkspace(
	userId: string,
	input: { name: string; currency: string },
) {
	const base = slugify(input.name);
	let slug = base;
	for (let i = 2; ; i++) {
		const taken = await db.query.workspaces.findFirst({
			where: eq(schema.workspaces.slug, slug),
		});
		if (!taken) break;
		slug = `${base}-${i}`;
	}
	const [ws] = await db
		.insert(schema.workspaces)
		.values({ name: input.name, slug, baseCurrency: input.currency })
		.returning();
	await db
		.insert(schema.workspaceMembers)
		.values({ workspaceId: ws.id, userId, role: "owner" });
	await db.insert(schema.alertRules).values([
		{ workspaceId: ws.id, kind: "cost_spike", threshold: 1 },
		{ workspaceId: ws.id, kind: "margin_floor", threshold: 0.6 },
		{ workspaceId: ws.id, kind: "sync_failure" },
	]);
	return ws;
}
