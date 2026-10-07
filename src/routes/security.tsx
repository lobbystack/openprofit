import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "#/components/landing/footer";
import { Nav } from "#/components/landing/nav";
import { seo } from "#/lib/app";
import { getLegalPage } from "#/server/content.functions";

export const Route = createFileRoute("/security")({
	loader: () => getLegalPage({ data: "security" }),
	head: ({ loaderData }) =>
		seo({
			title: `${loaderData?.title} · OpenProfit`,
			description:
				"The key each provider needs, what OpenProfit does with it, how keys are encrypted, and how to keep them on your own server.",
			path: "/security",
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
