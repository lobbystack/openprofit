import { createFileRoute, notFound } from "@tanstack/react-router";
import { DOCS, renderDoc } from "#/lib/docs";

export const Route = createFileRoute("/docs/$slug")({
	loader: ({ params }) => {
		const doc = DOCS.find((d) => d.slug === params.slug);
		if (!doc) throw notFound();
		return { title: doc.title, html: renderDoc(doc.markdown) };
	},
	head: ({ loaderData }) => ({
		meta: [{ title: `${loaderData?.title} · OpenProfit` }],
	}),
	component: Page,
});

function Page() {
	const { html } = Route.useLoaderData();
	// Our own markdown files, rendered at build time.
	// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted content
	return <article dangerouslySetInnerHTML={{ __html: html }} />;
}
