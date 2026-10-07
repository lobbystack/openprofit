import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/export.csv")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				// Imported here so pages that skip the database never open it.
				const { exportCsv } = await import("#/server/export.server");
				return exportCsv(request);
			},
		},
	},
});
