import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/oauth/revoke")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { revoke } = await import("#/server/oauth.server");
				return revoke(request);
			},
			OPTIONS: async () => {
				const { preflight } = await import("#/server/oauth.server");
				return preflight();
			},
		},
	},
});
