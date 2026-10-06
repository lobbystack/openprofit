import { createFileRoute } from "@tanstack/react-router";
import { eq, ne } from "drizzle-orm";
import { SITE_URL } from "#/lib/app";
import { COMPARISONS, INTEGRATIONS } from "#/lib/content";
import { DOCS } from "#/lib/docs";

const STATIC = [
	"/",
	"/integrations",
	...INTEGRATIONS.map((p) => `/integrations/${p.slug}`),
	...COMPARISONS.map((p) => `/compare/${p.slug}`),
	...DOCS.map((d) => `/docs/${d.slug}`),
	"/changelog",
	"/privacy",
	"/terms",
	"/cookies",
];

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async () => {
				// Imported here so pages that skip the database never open it.
				const { db, schema } = await import("#/db");
				// Product pages their owners made public.
				const pub = await db
					.select({ ws: schema.workspaces.slug, p: schema.products.slug })
					.from(schema.products)
					.innerJoin(
						schema.workspaces,
						eq(schema.workspaces.id, schema.products.workspaceId),
					)
					.where(ne(schema.products.publicPage, "off"));
				const paths = [...STATIC, ...pub.map((r) => `/p/${r.ws}/${r.p}`)];
				return new Response(
					`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${SITE_URL}${p}</loc></url>`).join("\n")}\n</urlset>\n`,
					{
						headers: {
							"Content-Type": "application/xml; charset=utf-8",
							// The host caches .xml files; keep its copy to an hour.
							"Cache-Control": "public, max-age=3600",
						},
					},
				);
			},
		},
	},
});
