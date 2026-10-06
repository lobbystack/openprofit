import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "#/components/content-page";
import { seo } from "#/lib/app";
import { CHANGELOG } from "#/lib/content";

export const Route = createFileRoute("/changelog")({
	head: () =>
		seo({
			title: "Changelog · OpenProfit",
			description: CHANGELOG.description,
			path: "/changelog",
		}),
	component: () => <ContentPage html={CHANGELOG.html} />,
});
