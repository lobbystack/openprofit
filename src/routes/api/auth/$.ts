import { createFileRoute } from "@tanstack/react-router";

// Imported per request so pages that skip the database never open it.
const handler = async (request: Request) =>
	(await import("#/lib/auth")).auth.handler(request);

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => handler(request),
			POST: ({ request }) => handler(request),
		},
	},
});
