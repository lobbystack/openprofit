import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "#/lib/app";

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: () =>
				new Response(
					`User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /api/\nDisallow: /onboarding\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
					{ headers: { "Content-Type": "text/plain; charset=utf-8" } },
				),
		},
	},
});
