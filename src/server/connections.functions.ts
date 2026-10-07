import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { connector, connectorInfo, connectors } from "#/connectors";
import { db, schema } from "#/db";
import { capture } from "./analytics.server";
import { requireUser } from "./auth.server";
import { addConnection, connectionRows } from "./connections.server";
import { demoWorkspace } from "./demo.server";
import { syncConnection } from "./sync.server";
import { currentProduct, currentWorkspace } from "./workspace.server";

export type { ConnectionRow } from "./connections.server";

// `demo` reads the public demo workspace instead of the user's.
export const getConnections = createServerFn({ method: "GET" })
	.validator(z.object({ demo: z.boolean() }).optional())
	.handler(async ({ data }) => {
		const ws = data?.demo ? await demoWorkspace() : await currentWorkspace();
		return connectionRows(ws, (await currentProduct(ws))?.id ?? null);
	});

export const getConnectorInfo = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const c = connectors().find((c) => c.id === data.id);
		if (!c) throw notFound();
		return connectorInfo(c);
	});

export const listConnectors = createServerFn({ method: "GET" }).handler(
	async () => connectors().map(connectorInfo),
);

const Creds = z.record(z.string(), z.string().trim());

export const testConnection = createServerFn({ method: "POST" })
	.validator(z.object({ provider: z.string(), credentials: Creds }))
	.handler(async ({ data }) => {
		await currentWorkspace();
		try {
			const { label } = await connector(data.provider).verify(data.credentials);
			return { ok: true as const, label };
		} catch (err) {
			return {
				ok: false as const,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	});

export const createConnection = createServerFn({ method: "POST" })
	.validator(z.object({ provider: z.string(), credentials: Creds }))
	.handler(async ({ data }) => {
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		const conn = await addConnection(ws, data);
		await capture(user.id, ws.id, "connection_added", {
			provider: conn.provider,
			kind: conn.kind,
		});
		// First sync runs now so the overview has a number right away.
		try {
			await syncConnection(conn);
			return { id: conn.id, synced: true };
		} catch (err) {
			console.error(`[sync] first sync ${conn.provider}:`, err);
			return { id: conn.id, synced: false };
		}
	});

export const syncNow = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		const conn = await db.query.connections.findFirst({
			where: and(
				eq(schema.connections.id, data.id),
				eq(schema.connections.workspaceId, ws.id),
			),
		});
		if (!conn) throw new Error("Not found");
		const { written } = await syncConnection(conn, { full: true });
		return { written };
	});

export const deleteConnection = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		const [removed] = await db
			.delete(schema.connections)
			.where(
				and(
					eq(schema.connections.id, data.id),
					eq(schema.connections.workspaceId, ws.id),
				),
			)
			.returning({
				provider: schema.connections.provider,
				kind: schema.connections.kind,
			});
		if (removed) await capture(user.id, ws.id, "connection_removed", removed);
		return { ok: true };
	});
