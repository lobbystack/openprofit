import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "#/components/landing/footer";
import { Nav } from "#/components/landing/nav";
import { seo } from "#/lib/app";
import { LEGAL } from "#/lib/legal";

export const Route = createFileRoute("/cookies")({
	head: () =>
		seo({
			title: `${LEGAL.cookies.title} · OpenProfit`,
			description:
				"The cookies and browser storage OpenProfit uses, and how to change your choice.",
			path: "/cookies",
		}),
	component: Page,
});

function Page() {
	return (
		<>
			<Nav />
			<main className="prose-docs mx-auto w-full max-w-[720px] px-4 pt-28 pb-24">
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own markdown */}
				<article dangerouslySetInnerHTML={{ __html: LEGAL.cookies.html }} />
			</main>
			<Footer />
		</>
	);
}
