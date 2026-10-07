import { createFileRoute } from "@tanstack/react-router";

// OAuth discovery for the MCP server: RFC 9728 protected resource metadata
// and RFC 8414 authorization server metadata. See server/oauth.server.ts.
export const Route = createFileRoute("/.well-known/$")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const { wellKnown } = await import("#/server/oauth.server");
				return (
					wellKnown(request, params._splat ?? "") ??
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
