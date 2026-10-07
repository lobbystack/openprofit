import { createFileRoute } from "@tanstack/react-router";

// The providers POST /api/connections accepts, with their credential fields.
export const Route = createFileRoute("/api/providers")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const { authenticate, unauthorized } = await import(
					"#/server/api.server"
				);
				if (!(await authenticate(request))) return unauthorized();
				const { connectors } = await import("#/connectors");
				return Response.json(
					connectors().map((c) => ({
						id: c.id,
						name: c.name,
						kind: c.kind,
						fields: c.auth.fields.map((f) => ({
							name: f.name,
							label: f.label,
							secret: !!f.secret,
							optional: !!f.optional,
						})),
					})),
				);
			},
		},
	},
});
