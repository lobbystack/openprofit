import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbs, jsonLd, SITE_URL, seo } from "#/lib/app";
import { getContentPage } from "#/server/content.functions";

export const Route = createFileRoute("/docs/$slug")({
	loader: ({ params }) =>
		getContentPage({ data: { section: "docs", slug: params.slug } }),
	// No loader data on a 404.
	head: ({ loaderData: p }) =>
		p
			? {
					...seo({
						title: `${p.title} · OpenProfit docs`,
						description: p.description,
						path: `/docs/${p.slug}`,
					}),
					scripts: [
						jsonLd({
							"@graph": [
								breadcrumbs([
									["Docs", "/docs/connectors"],
									[p.title, `/docs/${p.slug}`],
								]),
								{
									"@type": "TechArticle",
									headline: p.title,
									description: p.description,
									url: `${SITE_URL}/docs/${p.slug}`,
								},
							],
						}),
					],
				}
			: {},
	component: Page,
});

function Page() {
	const { html } = Route.useLoaderData();
	// Our own markdown files, rendered at build time.
	// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted content
	return <article dangerouslySetInnerHTML={{ __html: html }} />;
}
