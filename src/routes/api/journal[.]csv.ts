import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/journal.csv")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				// Imported here so pages that skip the database never open it.
				const { journalDownload } = await import(
					"#/server/books-export.server"
				);
				return journalDownload(request);
			},
		},
	},
});
