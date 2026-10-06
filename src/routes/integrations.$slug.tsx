import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ContentPage } from "#/components/content-page";
import { seo } from "#/lib/app";
import { INTEGRATIONS } from "#/lib/content";

export const Route = createFileRoute("/integrations/$slug")({
	loader: ({ params }) => {
		const page = INTEGRATIONS.find((p) => p.slug === params.slug);
		if (!page) throw notFound();
		return page;
	},
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
