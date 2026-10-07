import { createFileRoute } from "@tanstack/react-router";

// OAuth authorization endpoint: checks the request, then hands it to the
// consent page. See server/oauth.server.ts.
export const Route = createFileRoute("/oauth/authorize")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const { authorize } = await import("#/server/oauth.server");
				return authorize(request);
			},
		},
	},
});
