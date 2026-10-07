// Local stdio MCP server. It forwards the remote OpenProfit tools and
// replaces connect_provider with a version that reads keys from env files
// on this machine, so key values never pass through the agent.
import {
	Client,
	UrlElicitationRequiredError as RemoteUrlElicitationRequired,
	StreamableHTTPClientTransport,
	type Tool,
} from "@modelcontextprotocol/client";
import {
	type CallToolResult,
	fromJsonSchema,
	type JsonSchemaType,
	McpServer,
	UrlElicitationRequiredError,
} from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import {
	connect,
	describeFields,
	getProvider,
	KNOWN_ENV,
	LOGIN_HINT,
	loadEnv,
	type Server,
	VERSION,
} from "./lib.js";

const INSTRUCTIONS = `OpenProfit shows revenue, costs and profit per product.

To add a provider such as Stripe or OpenAI, call connect_provider. Never ask the user to paste an API key into the chat: pass env var names and this server reads the values from env files on this machine. Suggest a restricted or read-only key when the provider offers one. If connect_provider finds no key, it returns a one-time link. Show the link to the user, then call connection_status with its link_id until the connection appears.`;

const CONNECT_DESCRIPTION = `Connect a provider (stripe, openai, vercel...) to the OpenProfit workspace. Pass env var names, never key values: this server reads the values from local env files.

Call it with only \`provider\` first. It lists the known env vars it found in .env and .env.local, plus the provider's fields. After the user picks one, call it again with \`fields\`, such as {"key": "STRIPE_RESTRICTED_KEY"}. If it finds no key, it returns a one-time link where the user enters the key in the browser.`;

const text = (message: string, isError = false): CallToolResult => ({
	content: [{ type: "text", text: message }],
	isError,
});

type Remote = { client: Client; tools: Tool[] };

// https://ts.sdk.modelcontextprotocol.io/v2/clients/connect.html
async function connectRemote(server: Server): Promise<Remote> {
	const client = new Client({ name: "openprofit-cli", version: VERSION });
	await client.connect(
		new StreamableHTTPClientTransport(new URL(`${server.url}/mcp`), {
			authProvider: { token: async () => server.token },
		}),
	);
	const tools: Tool[] = [];
	let cursor: string | undefined;
	do {
		const page = await client.listTools({ cursor });
		tools.push(...page.tools);
		cursor = page.nextCursor;
	} while (cursor);
	return { client, tools };
}

async function forward(
	remote: Remote,
	name: string,
	args: Record<string, unknown>,
): Promise<CallToolResult> {
	try {
		return await remote.client.callTool({ name, arguments: args });
	} catch (e) {
		// Pass a URL elicitation (-32042) on to the host unchanged; McpServer
		// rethrows this error instead of turning it into a tool error.
		// https://ts.sdk.modelcontextprotocol.io/v2/servers/elicitation.html
		if (e instanceof RemoteUrlElicitationRequired) {
			throw new UrlElicitationRequiredError(e.elicitations, e.message);
		}
		throw e;
	}
}

export function serveMcp(server: Server) {
	// One remote connection per process, shared by every factory call.
	const remote = server.token
		? connectRemote(server).catch((e: Error) => {
				// stdout carries JSON-RPC, so log to stderr.
				console.error(`openprofit: ${server.url}/mcp: ${e.message}`);
				return undefined;
			})
		: undefined;

	// https://ts.sdk.modelcontextprotocol.io/v2/serving/stdio.html
	const handle = serveStdio(async () => {
		const mcp = new McpServer(
			{ name: "openprofit", version: VERSION },
			{ instructions: INSTRUCTIONS },
		);
		const r = await remote;

		// ponytail: tools are listed once at startup; restart the server to
		// pick up new remote tools, or handle tools/list_changed if that matters.
		for (const tool of r?.tools ?? []) {
			if (tool.name === "connect_provider") continue;
			mcp.registerTool(
				tool.name,
				{
					title: tool.title,
					description: tool.description,
					inputSchema: fromJsonSchema(tool.inputSchema as JsonSchemaType),
					outputSchema:
						tool.outputSchema &&
						fromJsonSchema(tool.outputSchema as JsonSchemaType),
					annotations: tool.annotations,
				},
				(args) =>
					forward(r as Remote, tool.name, args as Record<string, unknown>),
			);
		}

		// Tool annotations: https://ts.sdk.modelcontextprotocol.io/v2/servers/tools.html
		mcp.registerTool(
			"connect_provider",
			{
				title: "Connect a provider",
				description: CONNECT_DESCRIPTION,
				inputSchema: z.object({
					provider: z
						.string()
						.describe("Provider id, such as stripe or openai"),
					env_file: z
						.string()
						.optional()
						.describe(
							"Env file to read, relative to the working directory. Default: .env and .env.local",
						),
					fields: z
						.record(z.string(), z.string())
						.optional()
						.describe(
							'Provider field name to env var name, such as {"key": "STRIPE_RESTRICTED_KEY"}',
						),
					values: z
						.record(z.string(), z.string())
						.optional()
						.describe(
							"Values for non-secret fields, such as a team id. Secret fields are rejected here.",
						),
					product_id: z
						.string()
						.optional()
						.describe("Product to assign the connection to"),
				}),
				annotations: {
					readOnlyHint: false,
					destructiveHint: false,
					idempotentHint: false,
					openWorldHint: true,
				},
			},
			async ({ provider, env_file, fields, values, product_id }) => {
				if (!server.token) return text(LOGIN_HINT, true);
				const files = env_file ? [env_file] : [".env", ".env.local"];
				const env = loadEnv(files, !env_file);
				const where = `${files.join(", ")} or the environment`;

				if (fields || values) {
					const message = await connect(server, {
						provider,
						env,
						envLabel: where,
						fields: fields ?? {},
						values: values ?? {},
						productId: product_id,
					});
					return text(`${message}.`);
				}

				const p = await getProvider(server, provider);
				const found = (KNOWN_ENV[p.id] ?? []).filter((name) => env[name]);
				if (found.length) {
					const secret = p.fields.find((f) => f.secret)?.name ?? "key";
					return text(
						`Found ${found.join(", ")} in ${where}. ${p.name} fields: ${describeFields(p)}. Ask the user which variable to use, then call connect_provider again with fields {"${secret}": "<ENV_VAR>"}.`,
					);
				}

				if (!r)
					throw new Error(`Can't reach ${server.url}/mcp to create a link.`);
				const result = await forward(r, "connect_provider", {
					provider: p.id,
					...(product_id && { product_id }),
				});
				if (result.isError) return result;
				return {
					...result,
					content: [
						{
							type: "text",
							text: `No ${p.name} key in ${where}. Show the user this link to enter the key in the browser, then call connection_status with the link_id.`,
						},
						...result.content,
					],
				};
			},
		);

		return mcp;
	});

	process.on("SIGINT", () => void handle.close());
}
