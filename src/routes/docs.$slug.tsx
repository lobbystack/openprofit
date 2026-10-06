import { createFileRoute, notFound } from "@tanstack/react-router";
import { seo } from "#/lib/app";
import { DOCS } from "#/lib/docs";

export const Route = createFileRoute("/docs/$slug")({
	loader: ({ params }) => {
		const doc = DOCS.find((d) => d.slug === params.slug);
		if (!doc) throw notFound();
		return {
			slug: doc.slug,
			title: doc.title,
			description: doc.description,
			html: doc.html,
		};
	},
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
