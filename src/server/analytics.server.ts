import { type Column, count, eq } from "drizzle-orm";
import { connectors } from "#/connectors";
import { authSchema, db, schema } from "#/db";
import { posthog } from "./observability.server";

// Product analytics, captured on the server where each action happens. The
// person is the user id and the workspace is a PostHog group. Properties
// never hold names, emails, amounts or keys. Off without POSTHOG_KEY.

type Props = Record<string, string | number | boolean | null | undefined>;

// PostHog's convention for events that belong to a group and no person:
// one static distinct id.
const NO_USER = "workspace-events";

// An event done by a user. Skipped when the user switched product
// analytics off in Settings. Never throws: analytics must not break the
// action it records.
export async function capture(
	userId: string,
	workspaceId: string | null,
	event: string,
	properties?: Props,
) {
	if (!posthog) return;
	try {
		const u = await db.query.user.findFirst({
			where: eq(authSchema.user.id, userId),
			columns: { analytics: true },
		});
		if (u && !u.analytics) return;
		posthog.capture({
			distinctId: userId,
			event,
			properties,
			groups: workspaceId ? { workspace: workspaceId } : undefined,
		});
	} catch (err) {
		console.error("[analytics]", err);
	}
}

// An event with no user behind it, such as a scheduled sync failing.
export function captureForWorkspace(
	workspaceId: string,
	event: string,
	properties?: Props,
) {
	posthog?.capture({
		distinctId: NO_USER,
		event,
		properties,
		groups: { workspace: workspaceId },
	});
}

// Workspace group properties: counts and settings, no names. Runs daily
// for every workspace and once when a workspace is created, on the hosted
// version only (callers check isCloud).
export async function identifyWorkspaces(workspaceId?: string) {
	if (!posthog) return;
	const only = (column: Column) =>
		workspaceId ? eq(column, workspaceId) : undefined;
	const [workspaces, conns, products, members] = await Promise.all([
		db.select().from(schema.workspaces).where(only(schema.workspaces.id)),
		db
			.select({
				ws: schema.connections.workspaceId,
				provider: schema.connections.provider,
				kind: schema.connections.kind,
				n: count(),
			})
			.from(schema.connections)
			.where(only(schema.connections.workspaceId))
			.groupBy(
				schema.connections.workspaceId,
				schema.connections.provider,
				schema.connections.kind,
			),
		db
			.select({ ws: schema.products.workspaceId, n: count() })
			.from(schema.products)
			.where(only(schema.products.workspaceId))
			.groupBy(schema.products.workspaceId),
		db
			.select({ ws: schema.workspaceMembers.workspaceId, n: count() })
			.from(schema.workspaceMembers)
			.where(only(schema.workspaceMembers.workspaceId))
			.groupBy(schema.workspaceMembers.workspaceId),
	]);
	const productCount = new Map(products.map((r) => [r.ws, r.n]));
	const memberCount = new Map(members.map((r) => [r.ws, r.n]));
	for (const ws of workspaces) {
		const mine = conns.filter((c) => c.ws === ws.id);
		// One number per provider, 0 included, so a removed connection
		// overwrites the old count and insights can filter and average it.
		const byProvider = Object.fromEntries(
			connectors().map((c) => [
				`connections_${c.id}`,
				mine.filter((m) => m.provider === c.id).reduce((a, m) => a + m.n, 0),
			]),
		);
		posthog.groupIdentify({
			groupType: "workspace",
			groupKey: ws.id,
			properties: {
				plan: ws.plan,
				base_currency: ws.baseCurrency,
				created_at: new Date(ws.createdAt).toISOString(),
				connections: mine.reduce((a, m) => a + m.n, 0),
				...byProvider,
				has_revenue_connection: mine.some((m) => m.kind === "revenue"),
				has_cost_connection: mine.some((m) => m.kind === "cost"),
				products: productCount.get(ws.id) ?? 0,
				members: memberCount.get(ws.id) ?? 0,
			},
		});
	}
}
