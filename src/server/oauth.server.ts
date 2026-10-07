import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { BlockList } from "node:net";
import {
	and,
	count,
	eq,
	exists,
	gt,
	isNotNull,
	isNull,
	lt,
	notInArray,
	or,
} from "drizzle-orm";
import { db, schema } from "#/db";
import { decrypt, encrypt } from "#/lib/crypto";
import { appUrl, issueToken, randomToken, sha256 } from "./api.server";

// OAuth 2.1 authorization server for the remote MCP server, for clients that
// only connect with OAuth (claude.ai, ChatGPT, Cursor). The access token is
// an ordinary `op_` API token for the one workspace the user picks, so /mcp
// checks it like any other token and Settings lists and revokes it.
// https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
// https://claude.com/docs/connectors/building/authentication

const SCOPES = ["read", "write"];
type Scope = "read" | "write";
const scopeString = (s: Scope) => (s === "write" ? "read write" : "read");

// Access tokens last an hour and come with a rotating refresh token; Claude
// refreshes before expiry and on a 401.
const ACCESS_TTL = 3600;
const CODE_TTL = 5 * 60_000;
// The consent link, long enough to sign in with an emailed link.
const REQUEST_TTL = 30 * 60_000;
const DAY = 86_400_000;
// Registered clients that never got a token, at most, before /register
// answers 429.
const MAX_UNUSED_CLIENTS = 1000;

// The issuer, without a trailing slash. RFC 8414 §3.3: clients compare it
// with the URL they fetched the metadata from.
const issuer = (request: Request) =>
	new URL(appUrl(request)).href.replace(/\/$/, "");

const CORS = { "Access-Control-Allow-Origin": "*" };
export const oauthJson = (body: unknown, status = 200) =>
	Response.json(body, {
		status,
		headers: { ...CORS, "Cache-Control": "no-store" },
	});
const oauthError = (error: string, description: string, status = 400) =>
	oauthJson({ error, error_description: description }, status);
// Browser-based clients such as the MCP Inspector call these endpoints
// cross-origin.
export const preflight = () =>
	new Response(null, {
		status: 204,
		headers: {
			...CORS,
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});

// RFC 9728 protected resource metadata, served at
// /.well-known/oauth-protected-resource and at the /mcp-suffixed path
// (RFC 9728 §3.1). `resource` is the URL users add, which Claude requires.
function resourceMetadata(iss: string) {
	return {
		resource: `${iss}/mcp`,
		authorization_servers: [iss],
		scopes_supported: SCOPES,
		bearer_methods_supported: ["header"],
		resource_name: "OpenProfit",
		resource_documentation: `${iss}/docs/agents`,
	};
}

// RFC 8414 metadata. Public clients with PKCE only. Claude uses a Client ID
// Metadata Document when both `client_id_metadata_document_supported` and
// "none" are listed, and falls back to the registration endpoint otherwise.
// https://claude.com/docs/connectors/building/authentication#dcr-and-cimd-details
function serverMetadata(iss: string) {
	return {
		issuer: iss,
		authorization_endpoint: `${iss}/oauth/authorize`,
		token_endpoint: `${iss}/oauth/token`,
		registration_endpoint: `${iss}/oauth/register`,
		revocation_endpoint: `${iss}/oauth/revoke`,
		scopes_supported: SCOPES,
		response_types_supported: ["code"],
		grant_types_supported: ["authorization_code", "refresh_token"],
		token_endpoint_auth_methods_supported: ["none"],
		revocation_endpoint_auth_methods_supported: ["none"],
		code_challenge_methods_supported: ["S256"],
		client_id_metadata_document_supported: true,
		// RFC 9207: authorization responses carry `iss`.
		authorization_response_iss_parameter_supported: true,
		service_documentation: `${iss}/docs/agents`,
	};
}

// /.well-known/<path>. Null for paths it doesn't serve.
export function wellKnown(request: Request, path: string) {
	const iss = issuer(request);
	const doc =
		path === "oauth-protected-resource" ||
		path === "oauth-protected-resource/mcp"
			? resourceMetadata(iss)
			: path === "oauth-authorization-server"
				? serverMetadata(iss)
				: null;
	return (
		doc &&
		Response.json(doc, {
			headers: { ...CORS, "Cache-Control": "public, max-age=3600" },
		})
	);
}

// The 401 from /mcp names the metadata (RFC 9728 §5.1) and the scopes to ask
// for (MCP: Scope Selection Strategy). The consent page offers read-only.
export function challenge(request: Request) {
	const iss = issuer(request);
	const sent = request.headers.has("authorization");
	return Response.json(
		{ error: "Missing, expired or revoked API token." },
		{
			status: 401,
			headers: {
				"WWW-Authenticate": `Bearer resource_metadata="${iss}/.well-known/oauth-protected-resource/mcp", scope="read write"${sent ? ', error="invalid_token"' : ""}`,
			},
		},
	);
}

// RFC 8707: tokens are for this server's /mcp. The bare origin passes too,
// for clients that send the server's origin.
function ourResource(value: string, iss: string) {
	const u = URL.parse(value);
	if (!u || u.hash || u.search) return false;
	const v = u.href.replace(/\/$/, "");
	return v === iss || v === `${iss}/mcp`;
}

// Redirect URIs and clients

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);
const NOT_REDIRECTS = new Set([
	"javascript:",
	"data:",
	"vbscript:",
	"file:",
	"blob:",
	"about:",
	"ws:",
	"wss:",
	"ftp:",
]);

// https, http on a loopback host (RFC 8252 §7.3), or an app's own scheme
// such as cursor:// (RFC 8252 §7.1).
export function validRedirect(uri: unknown): uri is string {
	if (typeof uri !== "string" || uri.length > 2000) return false;
	const u = URL.parse(uri);
	if (!u || u.hash) return false;
	if (u.protocol === "http:") return LOOPBACK.has(u.hostname);
	return u.protocol === "https:" || !NOT_REDIRECTS.has(u.protocol);
}

// Exact match, except that a loopback redirect matches on any port: native
// clients such as Claude Code pick a free port each time (RFC 8252 §7.3).
function redirectAllowed(registered: string[], uri: string) {
	const u = URL.parse(uri);
	return (
		!!u &&
		registered.some((r) => {
			if (r === uri) return true;
			const a = URL.parse(r);
			if (!a || a.protocol !== "http:" || !LOOPBACK.has(a.hostname))
				return false;
			a.port = u.port;
			return a.href === u.href;
		})
	);
}

type Client = {
	id: string;
	name: string;
	redirectUris: string[];
	// The client_id's host for a metadata document client: the one part of
	// its identity that isn't self-asserted.
	host: string | null;
};

const clientName = (v: unknown) =>
	typeof v === "string" && v.trim()
		? v
				.replace(/[\p{Cc}\s]+/gu, " ")
				.trim()
				.slice(0, 60)
		: null;

// Client ID Metadata Documents are fetched from wherever the client says,
// so private addresses are refused. BlockList checks IPv4-mapped IPv6
// addresses against the IPv4 rules.
// https://datatracker.ietf.org/doc/html/draft-ietf-oauth-client-id-metadata-document-00#name-server-side-request-forgery
const PRIVATE = new BlockList();
for (const [net, bits] of [
	["0.0.0.0", 8],
	["10.0.0.0", 8],
	["100.64.0.0", 10],
	["127.0.0.0", 8],
	["169.254.0.0", 16],
	["172.16.0.0", 12],
	["192.168.0.0", 16],
] as const)
	PRIVATE.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [
	["::", 127],
	["fc00::", 7],
	["fe80::", 10],
] as const)
	PRIVATE.addSubnet(net, bits, "ipv6");

// https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/client-registration#client-id-metadata-documents
// ponytail: checks the addresses before fetch connects, so DNS rebinding
// between the two can still reach a private host; pin the address in a
// custom dispatcher if that matters. No caching: one fetch per sign-in.
async function fetchClientDocument(clientId: string): Promise<Client | null> {
	const url = URL.parse(clientId);
	if (
		!url ||
		url.protocol !== "https:" ||
		url.pathname === "/" ||
		url.hash ||
		url.username ||
		url.password
	)
		return null;
	try {
		const addresses = await lookup(url.hostname, { all: true });
		if (
			addresses.some((a) =>
				PRIVATE.check(a.address, a.family === 6 ? "ipv6" : "ipv4"),
			)
		)
			return null;
		const res = await fetch(url, {
			redirect: "error",
			signal: AbortSignal.timeout(5000),
			headers: { Accept: "application/json" },
		});
		const text = await res.text();
		if (!res.ok || text.length > 10_000) return null;
		const doc = JSON.parse(text);
		if (
			doc?.client_id !== clientId ||
			!Array.isArray(doc.redirect_uris) ||
			!doc.redirect_uris.length ||
			!doc.redirect_uris.every(validRedirect) ||
			(doc.token_endpoint_auth_method ?? "none") !== "none"
		)
			return null;
		return {
			id: clientId,
			name: clientName(doc.client_name) ?? url.hostname,
			redirectUris: doc.redirect_uris,
			host: url.hostname,
		};
	} catch {
		return null;
	}
}

async function findClient(clientId: string): Promise<Client | null> {
	if (clientId.startsWith("https://")) return fetchClientDocument(clientId);
	const row = await db.query.oauthClients.findFirst({
		where: eq(schema.oauthClients.id, clientId),
	});
	return row
		? { id: row.id, name: row.name, redirectUris: row.redirectUris, host: null }
		: null;
}

// Client ids that hold a live token.
const liveClients = () =>
	db
		.select({ id: schema.apiTokens.oauthClientId })
		.from(schema.apiTokens)
		.where(
			and(
				isNotNull(schema.apiTokens.oauthClientId),
				isNull(schema.apiTokens.revokedAt),
			),
		);

// POST /oauth/register: Dynamic Client Registration (RFC 7591), for clients
// without a metadata document. Public clients only.
export async function register(body: unknown) {
	const b = (body ?? {}) as Record<string, unknown>;
	const uris = b.redirect_uris;
	if (
		!Array.isArray(uris) ||
		!uris.length ||
		uris.length > 10 ||
		!uris.every(validRedirect)
	)
		return oauthError(
			"invalid_redirect_uri",
			"Send 1 to 10 redirect_uris, each https, http on localhost, or an app's own scheme.",
		);
	const grants = b.grant_types ?? ["authorization_code"];
	const types = b.response_types ?? ["code"];
	if (
		!Array.isArray(grants) ||
		grants.some((g) => g !== "authorization_code" && g !== "refresh_token") ||
		!Array.isArray(types) ||
		types.some((t) => t !== "code")
	)
		return oauthError(
			"invalid_client_metadata",
			"Only the authorization_code and refresh_token grants are supported.",
		);
	// Clients that never got a token go after a day, and only so many can
	// wait at once.
	// ponytail: one global cap; limit per IP if registrations get abused.
	await db
		.delete(schema.oauthClients)
		.where(
			and(
				lt(schema.oauthClients.createdAt, Date.now() - DAY),
				notInArray(schema.oauthClients.id, liveClients()),
			),
		);
	const [{ n }] = await db
		.select({ n: count() })
		.from(schema.oauthClients)
		.where(notInArray(schema.oauthClients.id, liveClients()));
	if (n >= MAX_UNUSED_CLIENTS)
		return oauthError(
			"temporarily_unavailable",
			"Too many registrations. Try again later.",
			429,
		);
	const [row] = await db
		.insert(schema.oauthClients)
		.values({
			name: clientName(b.client_name) ?? "MCP client",
			redirectUris: uris,
		})
		.returning();
	return oauthJson(
		{
			client_id: row.id,
			client_id_issued_at: Math.floor(row.createdAt / 1000),
			client_name: row.name,
			redirect_uris: row.redirectUris,
			grant_types: ["authorization_code", "refresh_token"],
			response_types: ["code"],
			token_endpoint_auth_method: "none",
		},
		201,
	);
}

// Authorization

// A checked authorization request, carried encrypted in the consent page's
// URL so it survives the sign-in detour without a database row.
export type ConsentRequest = {
	clientId: string;
	name: string;
	host: string | null;
	redirectUri: string;
	challenge: string;
	state: string | null;
	iss: string;
	// What the client asked for; the user can only narrow it.
	scope: Scope;
	exp: number;
};

const found = (location: string) =>
	new Response(null, { status: 302, headers: { Location: location } });

// GET /oauth/authorize. A bad client or redirect_uri is shown on our page,
// since redirecting would trust it; other errors go back to the client
// (OAuth 2.1 §4.1.2.1). A valid request moves on to the consent page.
export async function authorize(request: Request) {
	const q = new URL(request.url).searchParams;
	const iss = issuer(request);
	const clientId = q.get("client_id") ?? "";
	const redirectUri = q.get("redirect_uri") ?? "";
	const client = clientId ? await findClient(clientId) : null;
	if (!client) return found("/oauth/consent?error=client");
	if (
		!validRedirect(redirectUri) ||
		!redirectAllowed(client.redirectUris, redirectUri)
	)
		return found("/oauth/consent?error=redirect_uri");
	const state = q.get("state");
	const back = (error: string, description: string) => {
		const u = new URL(redirectUri);
		u.searchParams.set("error", error);
		u.searchParams.set("error_description", description);
		if (state) u.searchParams.set("state", state);
		u.searchParams.set("iss", iss);
		return found(u.href);
	};
	if (q.get("response_type") !== "code")
		return back("unsupported_response_type", "Use response_type=code.");
	const challenge = q.get("code_challenge") ?? "";
	if (
		q.get("code_challenge_method") !== "S256" ||
		!/^[\w-]{43}$/.test(challenge)
	)
		return back("invalid_request", "PKCE with S256 is required.");
	const resource = q.get("resource");
	if (resource && !ourResource(resource, iss))
		return back("invalid_target", `Use resource=${iss}/mcp.`);
	// Unknown scopes, such as offline_access, are ignored.
	const scopes = (q.get("scope") ?? "").split(" ");
	const consent: ConsentRequest = {
		clientId: client.id,
		name: client.name,
		host: client.host,
		redirectUri,
		challenge,
		state,
		iss,
		scope:
			scopes.includes("read") && !scopes.includes("write") ? "read" : "write",
		exp: Date.now() + REQUEST_TTL,
	};
	return found(
		`/oauth/consent?${new URLSearchParams({ request: await encrypt(consent) })}`,
	);
}

export async function openConsent(request: string) {
	try {
		const r = await decrypt<ConsentRequest>(request);
		return typeof r?.exp === "number" && r.exp > Date.now() ? r : null;
	} catch {
		return null;
	}
}

// Where the approval goes, for the consent page. The spec asks for the
// redirect host to be clear, with a warning when it's this computer.
export function redirectTarget(uri: string) {
	const u = new URL(uri);
	if (u.protocol === "https:") return { host: u.hostname, local: false };
	if (u.protocol === "http:") return { host: u.hostname, local: true };
	return { host: `${u.protocol}//${u.host}`, local: true };
}

// Approve (a workspace and scope) or deny (null). Returns the URL to send
// the browser to.
export async function decide(
	r: ConsentRequest,
	grant: { userId: string; workspaceId: string; scope: Scope } | null,
) {
	const u = new URL(r.redirectUri);
	if (grant) {
		const code = randomToken();
		const now = Date.now();
		await db
			.delete(schema.oauthCodes)
			.where(lt(schema.oauthCodes.expiresAt, now));
		await db.insert(schema.oauthCodes).values({
			codeHash: sha256(code),
			workspaceId: grant.workspaceId,
			userId: grant.userId,
			clientId: r.clientId,
			clientName: r.name,
			redirectUri: r.redirectUri,
			codeChallenge: r.challenge,
			scope: r.scope === "read" ? "read" : grant.scope,
			expiresAt: now + CODE_TTL,
		});
		u.searchParams.set("code", code);
	} else {
		u.searchParams.set("error", "access_denied");
	}
	if (r.state) u.searchParams.set("state", r.state);
	u.searchParams.set("iss", r.iss);
	return u.href;
}

// Tokens

const pkce = (verifier: string, challenge: string) =>
	/^[\w.~-]{43,128}$/.test(verifier) &&
	createHash("sha256").update(verifier).digest("base64url") === challenge;

const tokenResponse = (access: string, refresh: string, scope: Scope) =>
	oauthJson({
		access_token: access,
		token_type: "Bearer",
		expires_in: ACCESS_TTL,
		refresh_token: refresh,
		scope: scopeString(scope),
	});

// POST /oauth/token, form-encoded (RFC 6749 §4.1.3).
export async function token(request: Request) {
	const f = new URLSearchParams(await request.text());
	const clientId = f.get("client_id");
	if (!clientId) return oauthError("invalid_request", "client_id is required.");
	const resource = f.get("resource");
	if (resource && !ourResource(resource, issuer(request)))
		return oauthError("invalid_target", "Unknown resource.");
	const now = Date.now();
	const refresh = `opr_${randomToken()}`;

	if (f.get("grant_type") === "authorization_code") {
		const codeHash = sha256(f.get("code") ?? "");
		const [code] = await db
			.update(schema.oauthCodes)
			.set({ usedAt: now })
			.where(
				and(
					eq(schema.oauthCodes.codeHash, codeHash),
					isNull(schema.oauthCodes.usedAt),
					gt(schema.oauthCodes.expiresAt, now),
				),
			)
			.returning();
		if (!code) {
			// A code used twice revokes the first token (OAuth 2.1 §4.1.3).
			const used = await db.query.oauthCodes.findFirst({
				where: eq(schema.oauthCodes.codeHash, codeHash),
			});
			if (used?.apiTokenId)
				await db
					.update(schema.apiTokens)
					.set({ revokedAt: now })
					.where(eq(schema.apiTokens.id, used.apiTokenId));
			return oauthError(
				"invalid_grant",
				"The code is invalid, expired or used.",
			);
		}
		if (
			code.clientId !== clientId ||
			code.redirectUri !== f.get("redirect_uri") ||
			!pkce(f.get("code_verifier") ?? "", code.codeChallenge)
		)
			return oauthError(
				"invalid_grant",
				"client_id, redirect_uri or code_verifier doesn't match.",
			);
		const { token: access, row } = await issueToken({
			workspaceId: code.workspaceId,
			userId: code.userId,
			name: `${code.clientName} (OAuth)`,
			scope: code.scope,
			oauthClientId: clientId,
			expiresAt: now + ACCESS_TTL * 1000,
			refreshHash: sha256(refresh),
		});
		await db
			.update(schema.oauthCodes)
			.set({ apiTokenId: row.id })
			.where(eq(schema.oauthCodes.id, code.id));
		return tokenResponse(access, refresh, code.scope);
	}

	if (f.get("grant_type") === "refresh_token") {
		// Rotation (OAuth 2.1 §4.3.1): the old refresh token stops working in
		// the same update. Revoked tokens and users who left the workspace get
		// nothing.
		const access = `op_${randomToken()}`;
		const t = schema.apiTokens;
		const [row] = await db
			.update(t)
			.set({
				tokenHash: sha256(access),
				prefix: access.slice(0, 10),
				refreshHash: sha256(refresh),
				expiresAt: now + ACCESS_TTL * 1000,
			})
			.where(
				and(
					eq(t.refreshHash, sha256(f.get("refresh_token") ?? "")),
					eq(t.oauthClientId, clientId),
					isNull(t.revokedAt),
					exists(
						db
							.select()
							.from(schema.workspaceMembers)
							.where(
								and(
									eq(schema.workspaceMembers.workspaceId, t.workspaceId),
									eq(schema.workspaceMembers.userId, t.userId),
								),
							),
					),
				),
			)
			.returning();
		if (!row)
			return oauthError(
				"invalid_grant",
				"The refresh token is invalid or revoked.",
			);
		return tokenResponse(access, refresh, row.scope);
	}

	return oauthError(
		"unsupported_grant_type",
		"Use authorization_code or refresh_token.",
	);
}

// POST /oauth/revoke (RFC 7009), for access or refresh tokens. Holding a
// token is enough to revoke it, and unknown tokens get 200 as well.
export async function revoke(request: Request) {
	const value = new URLSearchParams(await request.text()).get("token");
	if (!value) return oauthError("invalid_request", "token is required.");
	const h = sha256(value);
	await db
		.update(schema.apiTokens)
		.set({ revokedAt: Date.now() })
		.where(
			and(
				or(
					eq(schema.apiTokens.tokenHash, h),
					eq(schema.apiTokens.refreshHash, h),
				),
				isNull(schema.apiTokens.revokedAt),
			),
		);
	return new Response(null, { status: 200, headers: CORS });
}
