import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "#/components/content-page";
import { SITE_URL, seo } from "#/lib/app";
import { dayLabel } from "#/lib/format";
import { getPost } from "#/server/content.functions";

export const Route = createFileRoute("/blog/$slug")({
	loader: ({ params }) => getPost({ data: params.slug }),
	head: ({ loaderData: p }) => ({
		...seo({
			title: `${p?.title} · OpenProfit`,
			description: p?.description,
			path: `/blog/${p?.slug}`,
		}),
		// schema.org BlogPosting: https://schema.org/BlogPosting
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify({
					"@context": "https://schema.org",
					"@type": "BlogPosting",
					headline: p?.title,
					description: p?.description,
					datePublished: p?.date,
					url: `${SITE_URL}/blog/${p?.slug}`,
					author: { "@type": "Person", name: p?.author },
					publisher: { "@type": "Organization", name: "Lobbystack Inc." },
				}),
			},
		],
	}),
	component: Post,
});

function Post() {
	const p = Route.useLoaderData();
	return (
		<ContentPage html={p.html}>
			<p className="mb-4 text-[13px] text-text-2">
				<time dateTime={p.date}>{dayLabel(p.date)}</time> · {p.author}
			</p>
		</ContentPage>
	);
}
