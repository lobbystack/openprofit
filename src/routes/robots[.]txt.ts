import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "#/lib/app";

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: () =>
				new Response(
					`# Content signals (contentsignals.org): search engines and AI answers may\n# use this site. No preference stated on AI training.\nUser-agent: *\nContent-Signal: search=yes, ai-input=yes\nAllow: /\nDisallow: /app\nDisallow: /api/\nDisallow: /onboarding\nDisallow: /oauth/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
					{ headers: { "Content-Type": "text/plain; charset=utf-8" } },
				),
		},
	},
});
