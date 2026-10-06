import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "#/components/landing/footer";
import { Nav } from "#/components/landing/nav";
import { seo } from "#/lib/app";
import { LEGAL } from "#/lib/legal";

export const Route = createFileRoute("/terms")({
	head: () =>
		seo({
			title: `${LEGAL.terms.title} · OpenProfit`,
			description:
				"The terms for using the hosted OpenProfit service at openprofit.dev.",
			path: "/terms",
		}),
	component: Page,
});

function Page() {
	return (
		<>
			<Nav />
			<main className="prose-docs mx-auto w-full max-w-[720px] px-4 pt-28 pb-24">
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own markdown */}
				<article dangerouslySetInnerHTML={{ __html: LEGAL.terms.html }} />
			</main>
			<Footer />
		</>
	);
}
