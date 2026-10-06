import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "#/components/content-page";
import { seo } from "#/lib/app";
import { getChangelog } from "#/server/content.functions";

export const Route = createFileRoute("/changelog")({
	loader: () => getChangelog(),
	head: ({ loaderData }) =>
		seo({
			title: "Changelog · OpenProfit",
			description: loaderData?.description,
			path: "/changelog",
		}),
	component: () => <ContentPage html={Route.useLoaderData().html} />,
});
