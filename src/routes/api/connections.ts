import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
	provider: z.string(),
	credentials: z.record(z.string(), z.string()),
	product_id: z.string().optional(),
});

// Adds a connection with a write token, the same way the Connect page does.
// Used by `npx openprofit connect` and the local MCP server.
export const Route = createFileRoute("/api/connections")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const { audit, authenticate, providerError, unauthorized } =
					await import("#/server/api.server");
				const caller = await authenticate(request);
				if (!caller) return unauthorized();
				if (caller.token.scope !== "write")
					return Response.json(
						{ error: "This token is read-only." },
						{ status: 403 },
					);
				const body = Body.safeParse(await request.json().catch(() => null));
				if (!body.success)
					return Response.json(
						{ error: "Send {provider, credentials: {field: value}}." },
						{ status: 400 },
					);
				const { provider, credentials, product_id } = body.data;
				const { addConnection } = await import("#/server/connections.server");
				let conn: Awaited<ReturnType<typeof addConnection>>;
				try {
					conn = await addConnection(caller.ws, {
						provider,
						credentials,
						productId: product_id,
					});
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					return Response.json(
						{ error: providerError(provider, message, credentials) },
						{ status: 400 },
					);
				}
				await audit(caller, "cli", "connection.create", conn.id, {
					name: conn.label ?? conn.provider,
					provider: conn.provider,
				});
				const { syncConnection } = await import("#/server/sync.server");
				void syncConnection(conn).catch((err) =>
					console.error(`[sync] first sync ${conn.provider}:`, err),
				);
				return Response.json(
					{
						connection: {
							id: conn.id,
							provider: conn.provider,
							label: conn.label,
						},
						sync: "started",
					},
					{ status: 201 },
				);
			},
		},
	},
});
