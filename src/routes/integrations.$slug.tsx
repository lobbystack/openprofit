import { createFileRoute, Link } from "@tanstack/react-router";
import { ContentPage } from "#/components/content-page";
import { seo } from "#/lib/app";
import { getContentPage } from "#/server/content.functions";

export const Route = createFileRoute("/integrations/$slug")({
	loader: ({ params }) =>
		getContentPage({ data: { section: "integrations", slug: params.slug } }),
	head: ({ loaderData: p }) =>
		seo({
			title: `${p?.title} · OpenProfit`,
			description: p?.description,
			path: `/integrations/${p?.slug}`,
		}),
	component: Integration,
});

function Integration() {
	const page = Route.useLoaderData();
	return (
		<ContentPage html={page.html}>
			<Link
				to="/integrations"
				className="text-[13px] text-text-2 hover:text-ink"
			>
				Integrations
			</Link>
		</ContentPage>
	);
}
