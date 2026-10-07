import { redirect } from "@tanstack/react-router";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "#/db";
import { requireUser } from "./auth.server";

export type Workspace = typeof schema.workspaces.$inferSelect;

const COOKIE = "op_ws";
// The product picked in the switcher; absent means All.
const PRODUCT_COOKIE = "op_product";

export function rememberWorkspace(id: string) {
	setCookie(COOKIE, id, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: 60 * 60 * 24 * 365,
	});
}

export function rememberProduct(id: string | null) {
	setCookie(PRODUCT_COOKIE, id ?? "", {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: id ? 60 * 60 * 24 * 365 : 0,
	});
}

// The switcher's product in this workspace, or null for All. A product from
// another workspace, or one since deleted, counts as All.
export async function currentProduct(ws: Workspace) {
	const id = getCookie(PRODUCT_COOKIE);
	if (!id) return null;
	const p = await db.query.products.findFirst({
		where: and(
			eq(schema.products.id, id),
			eq(schema.products.workspaceId, ws.id),
		),
	});
	return p ?? null;
}

export async function userWorkspaces(userId: string) {
	return db
		.select({ id: schema.workspaces.id, name: schema.workspaces.name })
		.from(schema.workspaceMembers)
		.innerJoin(
			schema.workspaces,
			eq(schema.workspaces.id, schema.workspaceMembers.workspaceId),
		)
		.where(
			and(
				eq(schema.workspaceMembers.userId, userId),
				// The public demo is read-only: nobody works in it as a member.
				eq(schema.workspaces.demo, false),
			),
		)
		.orderBy(schema.workspaceMembers.createdAt);
}

// The workspace picked in the switcher (a cookie), else the user's first.
// Redirects to onboarding when they have none. Never the demo workspace, so
// no server function that starts here can change it.
export async function currentWorkspace(): Promise<Workspace> {
	const user = await requireUser();
	const picked = getCookie(COOKIE);
	const mine = await userWorkspaces(user.id);
	const id = (mine.find((w) => w.id === picked) ?? mine[0])?.id;
	if (!id) throw redirect({ to: "/onboarding" });
	const ws = await db.query.workspaces.findFirst({
		where: eq(schema.workspaces.id, id),
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
	input: { name: string; currency: string; timezone?: string },
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
		.values({
			name: input.name,
			slug,
			baseCurrency: input.currency,
			timezone: input.timezone,
		})
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
