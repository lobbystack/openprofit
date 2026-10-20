import { createFileRoute, Link } from "@tanstack/react-router";
import { ContentPage } from "#/components/content-page";
import { providerName } from "#/components/provider-logo";
import { breadcrumbs, jsonLd, seo } from "#/lib/app";
import { getContentPage } from "#/server/content.functions";

export const Route = createFileRoute("/integrations/$slug")({
	loader: ({ params }) =>
		getContentPage({ data: { section: "integrations", slug: params.slug } }),
	// No loader data on a 404.
	head: ({ loaderData: p }) =>
		p
			? {
					...seo({
						title: `${p.title} · OpenProfit`,
						description: p.description,
						path: `/integrations/${p.slug}`,
					}),
					scripts: [
						jsonLd({
							"@graph": [
								breadcrumbs([
									["Integrations", "/integrations"],
									[providerName(p.slug), `/integrations/${p.slug}`],
								]),
								// Read by AI answer engines; Google shows FAQ results
								// only for government and health sites.
								...(p.faq.length
									? [
											{
												"@type": "FAQPage",
												mainEntity: p.faq.map(({ q, a }) => ({
													"@type": "Question",
													name: q,
													acceptedAnswer: { "@type": "Answer", text: a },
												})),
											},
										]
									: []),
							],
						}),
					],
				}
			: {},
	component: Integration,
});

function Integration() {
	const page = Route.useLoaderData();
	return (
		<ContentPage
			html={page.html}
			cta={`Connect ${providerName(page.slug)} and see what each product keeps.`}
		>
			<Link
				to="/integrations"
				className="text-[13px] text-text-2 hover:text-ink"
			>
				Integrations
			</Link>
		</ContentPage>
	);
}
