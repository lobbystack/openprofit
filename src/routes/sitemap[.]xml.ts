import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "#/lib/app";
import { DOCS } from "#/lib/docs";

const PATHS = [
	"/",
	...DOCS.map((d) => `/docs/${d.slug}`),
	"/privacy",
	"/terms",
];

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: () =>
				new Response(
					`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PATHS.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join("\n")}\n</urlset>\n`,
					{ headers: { "Content-Type": "application/xml; charset=utf-8" } },
				),
		},
	},
});
