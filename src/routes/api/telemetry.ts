import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/telemetry")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { isCloud } = await import("#/server/billing.server");
				const { recordTelemetry } = await import("#/server/telemetry.server");
				if (!isCloud) return new Response("not here", { status: 404 });
				const ok = await recordTelemetry(
					await request.json().catch(() => null),
				);
				return new Response(ok ? "ok" : "bad request", {
					status: ok ? 200 : 400,
				});
			},
		},
	},
});
