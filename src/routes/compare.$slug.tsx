import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "#/components/content-page";
import { seo } from "#/lib/app";
import { getContentPage } from "#/server/content.functions";

export const Route = createFileRoute("/compare/$slug")({
	loader: ({ params }) =>
		getContentPage({ data: { section: "compare", slug: params.slug } }),
	head: ({ loaderData: p }) =>
		seo({
			title: `${p?.title} · OpenProfit`,
			description: p?.description,
			path: `/compare/${p?.slug}`,
		}),
	component: () => <ContentPage html={Route.useLoaderData().html} />,
});
