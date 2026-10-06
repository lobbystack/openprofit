import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "#/components/landing/footer";
import { Nav } from "#/components/landing/nav";
import { seo } from "#/lib/app";
import { getLegalPage } from "#/server/content.functions";

export const Route = createFileRoute("/cookies")({
	loader: () => getLegalPage({ data: "cookies" }),
	head: ({ loaderData }) =>
		seo({
			title: `${loaderData?.title} · OpenProfit`,
			description:
				"The cookies OpenProfit sets, and why its analytics need none.",
			path: "/cookies",
		}),
	component: Page,
});

function Page() {
	const { html } = Route.useLoaderData();
	return (
		<>
			<Nav />
			<main className="prose-docs mx-auto w-full max-w-[720px] px-4 pt-28 pb-24">
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own markdown */}
				<article dangerouslySetInnerHTML={{ __html: html }} />
			</main>
			<Footer />
		</>
	);
}
