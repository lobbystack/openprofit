import { createFileRoute } from "@tanstack/react-router";
import { COMPARISONS, INTEGRATIONS, POSTS } from "#/lib/content";
import { DOCS } from "#/lib/docs";

// Every page listed in /llms.txt, as one markdown file (llms-full.txt).
const PATHS = [
	"/",
	"/security",
	...DOCS.map((d) => `/docs/${d.slug}`),
	...INTEGRATIONS.map((p) => `/integrations/${p.slug}`),
	...COMPARISONS.map((p) => `/compare/${p.slug}`),
	...POSTS.map((p) => `/blog/${p.slug}`),
];

export const Route = createFileRoute("/llms-full.txt")({
	server: {
		handlers: {
			GET: async () => {
				const { markdownFor } = await import("#/server/markdown.server");
				const body = PATHS.flatMap((p) => markdownFor(p) ?? []).join(
					"\n\n---\n\n",
				);
				return new Response(`${body}\n`, {
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				});
			},
		},
	},
});
