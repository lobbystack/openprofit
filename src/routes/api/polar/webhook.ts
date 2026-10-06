import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/polar/webhook")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { applyWebhook, verifyWebhook } = await import(
					"#/server/billing.server"
				);
				const body = await request.text();
				if (!verifyWebhook(body, request.headers))
					return new Response("bad signature", { status: 403 });
				await applyWebhook(JSON.parse(body));
				return new Response("ok");
			},
		},
	},
});
