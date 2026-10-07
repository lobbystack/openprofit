import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cli/login/poll")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const body = await request.json().catch(() => null);
				if (typeof body?.device_code !== "string")
					return Response.json(
						{ error: "Send {device_code} from POST /api/cli/login." },
						{ status: 400 },
					);
				const { pollCliLogin, pollLimit } = await import("#/server/cli.server");
				const limited = pollLimit(request, body.device_code);
				if (limited) return limited;
				const { status, body: out } = await pollCliLogin(body.device_code);
				return Response.json(out, { status });
			},
		},
	},
});
