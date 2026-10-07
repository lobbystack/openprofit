import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { connector, connectorInfo, connectors } from "#/connectors";
import type { ConnectorInfo } from "#/connectors/registry";
import { db, schema } from "#/db";
import { requireUser, sessionUser } from "./auth.server";
import { findConnectLink, redeemConnectLink } from "./connect.server";

// The /connect/<token> page, where a key an agent asked for is entered in
// the browser. The signed-in user must be a member of the link's workspace.

async function memberLink(token: string) {
	const user = await requireUser();
	const link = await findConnectLink(token);
	if (!link) return null;
	const member = await db.query.workspaceMembers.findFirst({
		where: and(
			eq(schema.workspaceMembers.workspaceId, link.workspaceId),
			eq(schema.workspaceMembers.userId, user.id),
		),
	});
	return member ? link : null;
}

export type ConnectLinkPage =
	| { state: "signed-out" }
	| { state: "invalid" | "used" | "expired" }
	| { state: "ready"; workspace: string; info: ConnectorInfo };

export const getConnectLink = createServerFn({ method: "GET" })
	.validator(z.object({ token: z.string().max(100) }))
	.handler(async ({ data }): Promise<ConnectLinkPage> => {
		if (!(await sessionUser())) return { state: "signed-out" };
		const link = await memberLink(data.token);
		if (!link) return { state: "invalid" };
		if (link.usedAt) return { state: "used" };
		if (link.expiresAt <= Date.now()) return { state: "expired" };
		const c = connectors().find((c) => c.id === link.provider);
		const ws = await db.query.workspaces.findFirst({
			where: eq(schema.workspaces.id, link.workspaceId),
		});
		if (!c || !ws) return { state: "invalid" };
		return { state: "ready", workspace: ws.name, info: connectorInfo(c) };
	});

const Input = z.object({
	token: z.string().max(100),
	credentials: z.record(z.string(), z.string().trim()),
});

export const testConnectLink = createServerFn({ method: "POST" })
	.validator(Input)
	.handler(async ({ data }) => {
		const link = await memberLink(data.token);
		if (!link) throw new Error("This link doesn't work anymore.");
		try {
			const { label } = await connector(link.provider).verify(data.credentials);
			return { ok: true as const, label };
		} catch (err) {
			return {
				ok: false as const,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	});

export const redeemLink = createServerFn({ method: "POST" })
	.validator(Input.extend({ productId: z.string().max(100).optional() }))
	.handler(async ({ data }) => {
		const link = await memberLink(data.token);
		if (!link) throw new Error("This link doesn't work anymore.");
		const ws = await db.query.workspaces.findFirst({
			where: eq(schema.workspaces.id, link.workspaceId),
		});
		if (!ws) throw new Error("This link doesn't work anymore.");
		const conn = await redeemConnectLink(
			link,
			ws,
			data.credentials,
			data.productId,
		);
		return { label: conn.label };
	});
