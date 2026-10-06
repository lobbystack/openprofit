import { createFileRoute, notFound } from "@tanstack/react-router";
import { ContentPage } from "#/components/content-page";
import { seo } from "#/lib/app";
import { COMPARISONS } from "#/lib/content";

export const Route = createFileRoute("/compare/$slug")({
	loader: ({ params }) => {
		const page = COMPARISONS.find((p) => p.slug === params.slug);
		if (!page) throw notFound();
		return page;
	},
	head: ({ loaderData: p }) =>
		seo({
			title: `${p?.title} · OpenProfit`,
			description: p?.description,
			path: `/compare/${p?.slug}`,
		}),
	component: () => <ContentPage html={Route.useLoaderData().html} />,
});
