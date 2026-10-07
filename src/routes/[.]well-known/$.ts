import { createFileRoute } from "@tanstack/react-router";

// OAuth discovery for the MCP server (RFC 9728 protected resource metadata,
// RFC 8414 authorization server metadata; server/oauth.server.ts) and the
// agent discovery documents (server/discovery.server.ts).
export const Route = createFileRoute("/.well-known/$")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const path = params._splat ?? "";
				const { wellKnown } = await import("#/server/oauth.server");
				const { discovery } = await import("#/server/discovery.server");
				return (
					wellKnown(request, path) ??
					discovery(request, path) ??
					new Response("Not found", { status: 404 })
				);
			},
			OPTIONS: async () => {
				const { preflight } = await import("#/server/oauth.server");
				return preflight();
			},
		},
	},
});
