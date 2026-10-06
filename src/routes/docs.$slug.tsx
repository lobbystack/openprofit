import { createFileRoute } from "@tanstack/react-router";
import { seo } from "#/lib/app";
import { getContentPage } from "#/server/content.functions";

export const Route = createFileRoute("/docs/$slug")({
	loader: ({ params }) =>
		getContentPage({ data: { section: "docs", slug: params.slug } }),
	head: ({ loaderData }) =>
		seo({
			title: `${loaderData?.title} · OpenProfit docs`,
			description: loaderData?.description,
			path: `/docs/${loaderData?.slug}`,
		}),
	component: Page,
});

function Page() {
	const { html } = Route.useLoaderData();
	// Our own markdown files, rendered at build time.
	// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted content
	return <article dangerouslySetInnerHTML={{ __html: html }} />;
}
