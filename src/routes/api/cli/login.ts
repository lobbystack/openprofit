import { createFileRoute } from "@tanstack/react-router";

// Starts `npx openprofit login`. See server/cli.server.ts.
export const Route = createFileRoute("/api/cli/login")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { loginLimit, startCliLogin } = await import(
					"#/server/cli.server"
				);
				return (
					loginLimit(request) ?? Response.json(await startCliLogin(request))
				);
			},
		},
	},
});
