import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, gte, inArray, isNull, lt, ne, or } from "drizzle-orm";
import { db, schema } from "#/db";
import { describeError } from "#/lib/errors";
import { providerName } from "#/lib/providers";
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
	// OAuth tokens only; see oauth.server.ts.
	oauthClientId?: string;
	expiresAt?: number;
	refreshHash?: string;
}) {
	const token = `op_${randomToken()}`;
	const [row] = await db
		.insert(schema.apiTokens)
		.values({ ...input, tokenHash: sha256(token), prefix: token.slice(0, 10) })
		.returning();
	return { token, row };
}

// `Authorization: Bearer op_...` to the token and its workspace. The token
// stops working when revoked, when it expires (OAuth tokens) or when its
// creator leaves the workspace.
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
				or(
					isNull(schema.apiTokens.expiresAt),
					gt(schema.apiTokens.expiresAt, Date.now()),
				),
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

// A provider error for an agent or the CLI: the sentence describeError
// writes for the app (never the raw response body), then any 8 characters
// of a credential, or a masked run like Stripe's `rk_test_****abcd`, cut.
export function providerError(
	provider: string,
	message: string,
	secrets: Record<string, string>,
) {
	let m = describeError(providerName(provider), message).text;
	for (const v of Object.values(secrets)) {
		for (let i = 0; i + 8 <= v.length; i++) {
			m = m.split(v.slice(i, i + 8)).join("[redacted]");
		}
		if (v.length >= 4) m = m.split(v).join("[redacted]");
	}
	return m.replace(/(\[redacted\])?\*{3,}\w*/g, "[redacted]");
}

// Daily: expired connect links and CLI logins, and audit events older than
// the weekly email needs.
const DAY = 86_400_000;
export async function pruneAgentRecords() {
	const now = Date.now();
	await Promise.all([
		db
			.delete(schema.connectLinks)
			.where(lt(schema.connectLinks.expiresAt, now - DAY)),
		db.delete(schema.cliLogins).where(lt(schema.cliLogins.expiresAt, now)),
		db
			.delete(schema.auditEvents)
			.where(lt(schema.auditEvents.createdAt, now - 90 * DAY)),
	]);
}

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

// Changes made over MCP or the CLI since `since`, for the weekly email:
// every public page change first, then the 50 latest other changes, each
// group oldest first.
const PUBLIC_PAGE = "product.public_page";
export async function agentChanges(workspaceId: string, since: number) {
	const e = schema.auditEvents;
	const recent = and(
		eq(e.workspaceId, workspaceId),
		inArray(e.source, ["mcp", "cli"]),
		gte(e.createdAt, since),
	);
	const [pages, others] = await Promise.all([
		db.query.auditEvents.findMany({
			where: and(recent, eq(e.action, PUBLIC_PAGE)),
			orderBy: (a, { desc }) => desc(a.createdAt),
		}),
		db.query.auditEvents.findMany({
			where: and(recent, ne(e.action, PUBLIC_PAGE)),
			orderBy: (a, { desc }) => desc(a.createdAt),
			limit: 51,
		}),
	]);
	const more = others.length > 50;
	const rows = [...pages.reverse(), ...others.slice(0, 50).reverse()];
	const lines = rows.map((r) => {
		const d = r.detail ?? {};
		const name = typeof d.name === "string" ? d.name : r.target;
		if (r.action === PUBLIC_PAGE)
			return `Public page of ${name}: ${d.mode === "off" ? "turned off" : `turned on (${d.mode})`}`;
		return `${ACTIONS[r.action] ?? r.action}: ${name}`;
	});
	if (more) lines.push("Earlier changes this week aren't listed.");
	return lines;
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
