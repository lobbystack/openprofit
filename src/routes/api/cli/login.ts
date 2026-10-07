import { createFileRoute } from "@tanstack/react-router";

// Starts `npx openprofit login`. See server/cli.server.ts.
export const Route = createFileRoute("/api/cli/login")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { startCliLogin } = await import("#/server/cli.server");
				return Response.json(await startCliLogin(request));
			},
		},
	},
});
