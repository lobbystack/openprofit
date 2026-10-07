import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/oauth/register")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { register, registerLimit } = await import(
					"#/server/oauth.server"
				);
				return (
					registerLimit(request) ??
					register(await request.json().catch(() => null))
				);
			},
			OPTIONS: async () => {
				const { preflight } = await import("#/server/oauth.server");
				return preflight();
			},
		},
	},
});
