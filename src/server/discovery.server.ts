import { createHash } from "node:crypto";
import { DOCS } from "#/lib/docs";
import pkg from "../../package.json";

// Agent discovery documents under /.well-known/, next to the OAuth metadata
// in oauth.server.ts. Each one points agents at the remote MCP server.

// Agent Skills Discovery v0.2.0: one skill, the agents doc as its SKILL.md.
// The digest covers the exact bytes served.
// https://github.com/cloudflare/agent-skills-discovery-rfc
const SKILL_DESCRIPTION =
	"Connect to OpenProfit over MCP to read revenue, costs and profit per product, and to add products and provider connections. Use when someone asks about their OpenProfit numbers or wants to connect Stripe, OpenAI or another provider.";
const SKILL = `---\nname: openprofit\ndescription: ${SKILL_DESCRIPTION}\n---\n\n${DOCS.find((d) => d.slug === "agents")?.body ?? ""}\n`;
const SKILL_DIGEST = `sha256:${createHash("sha256").update(SKILL).digest("hex")}`;

// MCP Server Card.
// https://github.com/modelcontextprotocol/experimental-ext-server-card
// serverInfo, transport and capabilities come from the earlier SEP-1649
// draft, which scanners still read.
const serverCard = (base: string) => ({
	$schema:
		"https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
	name: "dev.openprofit/openprofit",
	title: "OpenProfit",
	version: pkg.version,
	description:
		"Revenue, costs and profit per product, pulled from Stripe, OpenAI and other provider APIs.",
	websiteUrl: base,
	repository: {
		url: "https://github.com/lobbystack/openprofit",
		source: "github",
	},
	icons: [{ src: `${base}/favicon.svg`, mimeType: "image/svg+xml" }],
	remotes: [{ type: "streamable-http", url: `${base}/mcp` }],
	serverInfo: { name: "openprofit", title: "OpenProfit", version: pkg.version },
	transport: { type: "streamable-http", endpoint: `${base}/mcp` },
	capabilities: { tools: {} },
});

// AI Catalog, as ARD reads it. https://github.com/Agent-Card/ai-catalog
const aiCatalog = (base: string, host: string) => ({
	specVersion: "1.0",
	host: { displayName: "OpenProfit", identifier: `did:web:${host}` },
	entries: [
		{
			identifier: `urn:air:${host}:mcp:openprofit`,
			displayName: "OpenProfit",
			type: "application/mcp-server-card+json",
			url: `${base}/.well-known/mcp/server-card.json`,
			representativeQueries: [
				"what was my profit last month",
				"which product costs the most to run",
				"how much did I spend on OpenAI this month",
				"connect Stripe to OpenProfit",
			],
		},
	],
});

// RFC 9727 API catalog. The MCP server is the only API.
const apiCatalog = (base: string) => ({
	linkset: [
		{
			anchor: `${base}/mcp`,
			"service-desc": [
				{
					href: `${base}/.well-known/mcp/server-card.json`,
					type: "application/mcp-server-card+json",
				},
			],
			"service-doc": [{ href: `${base}/docs/agents`, type: "text/html" }],
		},
	],
});

function doc(path: string, base: string): [body: string, type: string] | null {
	const host = new URL(base).hostname;
	switch (path) {
		case "mcp/server-card.json":
			return [
				JSON.stringify(serverCard(base)),
				"application/mcp-server-card+json",
			];
		case "ai-catalog.json":
			return [JSON.stringify(aiCatalog(base, host)), "application/json"];
		case "api-catalog":
			return [
				JSON.stringify(apiCatalog(base)),
				'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
			];
		case "agent-skills/index.json":
			return [
				JSON.stringify({
					$schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
					skills: [
						{
							name: "openprofit",
							type: "skill-md",
							description: SKILL_DESCRIPTION,
							url: `${base}/.well-known/agent-skills/openprofit/SKILL.md`,
							digest: SKILL_DIGEST,
						},
					],
				}),
				"application/json",
			];
		case "agent-skills/openprofit/SKILL.md":
			return [SKILL, "text/markdown; charset=utf-8"];
		default:
			return null;
	}
}

// /.well-known/<path>. Null for paths it doesn't serve.
export function discovery(request: Request, path: string) {
	const base = (process.env.APP_URL ?? new URL(request.url).origin).replace(
		/\/$/,
		"",
	);
	const found = doc(path, base);
	// Same caching rule as the OAuth metadata: the documents carry the
	// request's host unless APP_URL fixes it.
	return (
		found &&
		new Response(found[0], {
			headers: {
				"Content-Type": found[1],
				"Access-Control-Allow-Origin": "*",
				"Cache-Control": process.env.APP_URL
					? "public, max-age=3600"
					: "no-store",
			},
		})
	);
}
