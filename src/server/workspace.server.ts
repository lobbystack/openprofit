import { redirect } from "@tanstack/react-router";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "#/db";
import { requireUser } from "./auth.server";

export type Workspace = typeof schema.workspaces.$inferSelect;

const COOKIE = "op_ws";

export function rememberWorkspace(id: string) {
	setCookie(COOKIE, id, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: 60 * 60 * 24 * 365,
	});
}

export async function userWorkspaces(userId: string) {
	return db
		.select({ id: schema.workspaces.id, name: schema.workspaces.name })
		.from(schema.workspaceMembers)
		.innerJoin(
			schema.workspaces,
			eq(schema.workspaces.id, schema.workspaceMembers.workspaceId),
		)
		.where(eq(schema.workspaceMembers.userId, userId))
		.orderBy(schema.workspaceMembers.createdAt);
}

// The workspace picked in the switcher (a cookie), else the user's first.
// Redirects to onboarding when they have none.
export async function currentWorkspace(): Promise<Workspace> {
	const user = await requireUser();
	const picked = getCookie(COOKIE);
	const member =
		(picked &&
			(await db.query.workspaceMembers.findFirst({
				where: and(
					eq(schema.workspaceMembers.userId, user.id),
					eq(schema.workspaceMembers.workspaceId, picked),
				),
			}))) ||
		(await db.query.workspaceMembers.findFirst({
			where: eq(schema.workspaceMembers.userId, user.id),
			orderBy: (m, { asc }) => asc(m.createdAt),
		}));
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
