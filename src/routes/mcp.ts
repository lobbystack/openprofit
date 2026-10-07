import { createFileRoute } from "@tanstack/react-router";

// Remote MCP endpoint. Takes an API token or an OAuth access token as a
// bearer token; see server/mcp.server.ts and server/oauth.server.ts.
const serve = async ({ request }: { request: Request }) => {
	const { serveMcp } = await import("#/server/mcp.server");
	return serveMcp(request);
};

export const Route = createFileRoute("/mcp")({
	server: { handlers: { POST: serve, GET: serve, DELETE: serve } },
});
