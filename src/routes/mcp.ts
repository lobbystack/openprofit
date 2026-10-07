import { createFileRoute } from "@tanstack/react-router";

// Remote MCP endpoint. Bearer API token required; see server/mcp.server.ts.
const serve = async ({ request }: { request: Request }) => {
	const { serveMcp } = await import("#/server/mcp.server");
	return serveMcp(request);
};

export const Route = createFileRoute("/mcp")({
	server: { handlers: { POST: serve, GET: serve, DELETE: serve } },
});
