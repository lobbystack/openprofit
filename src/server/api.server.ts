import { createHash, randomBytes } from "node:crypto";
import { and, eq, gte, inArray, isNull } from "drizzle-orm";
import { db, schema } from "#/db";
import type { Workspace } from "./workspace.server";

// API tokens for the MCP endpoint and the CLI. Tokens are `op_` plus 32
// random bytes; only their SHA-256 is stored.

export type ApiToken = typeof schema.apiTokens.$inferSelect;
export type Caller = { token: ApiToken; ws: Workspace };

export const sha256 = (s: string) =>
	createHash("sha256").update(s).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");

// Links the app prints (CLI approval, connect links). APP_URL is the public
// origin; behind a proxy the request URL can be http.
export const appUrl = (request: Request) =>
	process.env.APP_URL ?? new URL(request.url).origin;

export async function issueToken(input: {
	workspaceId: string;
	userId: string;
	name: string;
	scope: "read" | "write";
}) {
	const token = `op_${randomToken()}`;
	const [row] = await db
		.insert(schema.apiTokens)
		.values({ ...input, tokenHash: sha256(token), prefix: token.slice(0, 10) })
		.returning();
	return { token, row };
}

// `Authorization: Bearer op_...` to the token and its workspace. The token
// stops working when revoked or when its creator leaves the workspace.
export async function authenticate(request: Request): Promise<Caller | null> {
	const raw = request.headers
		.get("authorization")
		?.match(/^Bearer\s+(op_[\w-]+)$/i)?.[1];
	if (!raw) return null;
	const [row] = await db
		.select({ token: schema.apiTokens, ws: schema.workspaces })
		.from(schema.apiTokens)
		.innerJoin(
			schema.workspaces,
			eq(schema.workspaces.id, schema.apiTokens.workspaceId),
		)
		.innerJoin(
			schema.workspaceMembers,
			and(
				eq(schema.workspaceMembers.workspaceId, schema.apiTokens.workspaceId),
				eq(schema.workspaceMembers.userId, schema.apiTokens.userId),
			),
		)
		.where(
			and(
				eq(schema.apiTokens.tokenHash, sha256(raw)),
				isNull(schema.apiTokens.revokedAt),
			),
		);
	if (!row) return null;
	// At most one write per token a minute.
	const now = Date.now();
	if (!row.token.lastUsedAt || now - row.token.lastUsedAt > 60_000)
		await db
			.update(schema.apiTokens)
			.set({ lastUsedAt: now })
			.where(eq(schema.apiTokens.id, row.token.id));
	return row;
}

export const unauthorized = () =>
	Response.json(
		{ error: "Missing or revoked API token." },
		{ status: 401, headers: { "WWW-Authenticate": "Bearer" } },
	);

// Provider error messages sometimes quote what they were sent.
export const redact = (message: string, secrets: Record<string, string>) =>
	Object.values(secrets)
		.filter((v) => v.length >= 4)
		.reduce((m, v) => m.split(v).join("[redacted]"), message);

export async function audit(
	caller: { ws: { id: string }; token: { id: string } },
	source: "mcp" | "cli",
	action: string,
	target?: string | null,
	detail?: Record<string, unknown>,
) {
	await db.insert(schema.auditEvents).values({
		workspaceId: caller.ws.id,
		actorKind: "token",
		actorId: caller.token.id,
		source,
		action,
		target,
		detail,
	});
}

// Changes made over MCP or the CLI since `since`, oldest first, for the
// weekly email. Public page changes come first.
export async function agentChanges(workspaceId: string, since: number) {
	const rows = await db.query.auditEvents.findMany({
		where: and(
			eq(schema.auditEvents.workspaceId, workspaceId),
			inArray(schema.auditEvents.source, ["mcp", "cli"]),
			gte(schema.auditEvents.createdAt, since),
		),
		orderBy: (a, { asc }) => asc(a.createdAt),
		limit: 50,
	});
	const lines = rows.map((r) => {
		const d = r.detail ?? {};
		const name = typeof d.name === "string" ? d.name : r.target;
		if (r.action === "product.public_page")
			return {
				pub: true,
				text: `Public page of ${name}: ${d.mode === "off" ? "turned off" : `turned on (${d.mode})`}`,
			};
		return { pub: false, text: `${ACTIONS[r.action] ?? r.action}: ${name}` };
	});
	return [...lines.filter((l) => l.pub), ...lines.filter((l) => !l.pub)].map(
		(l) => l.text,
	);
}

const ACTIONS: Record<string, string> = {
	"product.create": "Product added",
	"product.rename": "Product renamed",
	"product.delete": "Product removed",
	"connection.create": "Connection added",
	"connection.delete": "Connection removed",
	"connection.product": "Connection assigned",
	"mapping.set": "Sub-unit assigned",
	"mapping.delete": "Sub-unit unassigned",
	"flat_cost.create": "Flat cost added",
	"flat_cost.update": "Flat cost changed",
	"flat_cost.delete": "Flat cost removed",
	"alert_rule.update": "Alert rule changed",
};
