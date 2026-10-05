import { createFileRoute } from "@tanstack/react-router";
import { isCloud } from "#/server/billing.server";
import { recordTelemetry } from "#/server/telemetry.server";

export const Route = createFileRoute("/api/telemetry")({
	server: {
		handlers: {
			POST: async ({ request }) => {
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
