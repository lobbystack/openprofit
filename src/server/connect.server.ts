import { and, eq, gt, isNull } from "drizzle-orm";
import { connectors } from "#/connectors";
import type { Credentials } from "#/connectors/types";
import { db, schema } from "#/db";
import {
	appUrl,
	audit,
	type Caller,
	providerError,
	randomToken,
	sha256,
} from "./api.server";
import { addConnection } from "./connections.server";
import { syncConnection } from "./sync.server";
import type { Workspace } from "./workspace.server";

// One-time links (/connect/<token>) where the user enters a provider key in
// the browser, so the key never passes through an agent's chat.

const TTL = 15 * 60_000;

export async function createConnectLink(
	caller: Caller,
	request: Request,
	provider: string,
	productId?: string,
) {
	const c = connectors().find((c) => c.id === provider);
	if (!c)
		throw new Error(
			`Unknown provider "${provider}". list_providers has the ids.`,
		);
	if (productId) {
		const product = await db.query.products.findFirst({
			where: and(
				eq(schema.products.id, productId),
				eq(schema.products.workspaceId, caller.ws.id),
			),
		});
		if (!product) throw new Error("That product doesn't exist.");
	}
	const token = randomToken();
	const [link] = await db
		.insert(schema.connectLinks)
		.values({
			workspaceId: caller.ws.id,
			userId: caller.token.userId,
			apiTokenId: caller.token.id,
			provider: c.id,
			tokenHash: sha256(token),
			expiresAt: Date.now() + TTL,
		})
		.returning();
	// The product rides in the URL; the page checks it belongs to the
	// workspace before using it.
	const query = productId ? `?product=${encodeURIComponent(productId)}` : "";
	return {
		link_id: link.id,
		provider: c.name,
		url: `${appUrl(request)}/connect/${token}${query}`,
		expires_at: new Date(link.expiresAt).toISOString(),
	};
}

export async function connectLinkStatus(ws: Workspace, linkId: string) {
	const link = await db.query.connectLinks.findFirst({
		where: and(
			eq(schema.connectLinks.id, linkId),
			eq(schema.connectLinks.workspaceId, ws.id),
		),
	});
	if (!link) return null;
	if (link.connectionId) {
		const conn = await db.query.connections.findFirst({
			where: eq(schema.connections.id, link.connectionId),
		});
		if (conn)
			return {
				status: "connected" as const,
				connection: {
					id: conn.id,
					provider: conn.provider,
					label: conn.label,
					status: conn.status,
					last_synced_at: conn.lastSyncedAt
						? new Date(conn.lastSyncedAt).toISOString()
						: null,
					last_error:
						conn.lastError && providerError(conn.provider, conn.lastError, {}),
				},
			};
	}
	// Used for a connection since removed, or past its 15 minutes.
	if (link.usedAt || link.expiresAt <= Date.now())
		return { status: "expired" as const };
	return {
		status: "pending" as const,
		expires_at: new Date(link.expiresAt).toISOString(),
	};
}

export const findConnectLink = (token: string) =>
	db.query.connectLinks.findFirst({
		where: eq(schema.connectLinks.tokenHash, sha256(token)),
	});

export type ConnectLink = typeof schema.connectLinks.$inferSelect;

// Creates the connection the link was made for and uses the link up. The
// provider check runs first, so a wrong key leaves the link usable.
export async function redeemConnectLink(
	link: ConnectLink,
	ws: Workspace,
	credentials: Credentials,
	productId?: string,
) {
	// The product from the link's URL; dropped if it was deleted since.
	const product =
		productId &&
		(await db.query.products.findFirst({
			where: and(
				eq(schema.products.id, productId),
				eq(schema.products.workspaceId, ws.id),
			),
		}));
	const conn = await addConnection(ws, {
		provider: link.provider,
		credentials,
		productId: product ? product.id : undefined,
	});
	const [claimed] = await db
		.update(schema.connectLinks)
		.set({ usedAt: Date.now(), connectionId: conn.id })
		.where(
			and(
				eq(schema.connectLinks.id, link.id),
				isNull(schema.connectLinks.usedAt),
				gt(schema.connectLinks.expiresAt, Date.now()),
			),
		)
		.returning({ id: schema.connectLinks.id });
	if (!claimed) {
		await db
			.delete(schema.connections)
			.where(eq(schema.connections.id, conn.id));
		throw new Error("This link was already used or has expired.");
	}
	if (link.apiTokenId)
		await audit(
			{ ws, token: { id: link.apiTokenId } },
			"mcp",
			"connection.create",
			conn.id,
			{ name: conn.label ?? conn.provider, provider: conn.provider },
		);
	void syncConnection(conn).catch((err) =>
		console.error(`[sync] first sync ${conn.provider}:`, err),
	);
	return conn;
}
