import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/oauth/token")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { token } = await import("#/server/oauth.server");
				return token(request);
			},
			OPTIONS: async () => {
				const { preflight } = await import("#/server/oauth.server");
				return preflight();
			},
		},
	},
});
