import { Footer } from "#/components/landing/footer";
import { Nav } from "#/components/landing/nav";
import { Button } from "#/components/landing/primitives";

// Marketing article: nav, rendered markdown, a closing call to action.
export function ContentPage({
	html,
	children,
}: {
	html: string;
	children?: React.ReactNode;
}) {
	return (
		<>
			<Nav />
			<main className="mx-auto w-full max-w-[720px] px-4 pt-28 pb-20">
				{children}
				<article
					className="prose-docs"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: our own markdown
					dangerouslySetInnerHTML={{ __html: html }}
				/>
				<div className="mt-14 flex flex-col items-start gap-4 rounded-xl border border-line bg-card p-6">
					<p className="text-[15px]">
						See revenue, costs and profit for every product you run.
					</p>
					<div className="flex gap-3">
						<Button href="/login">Start for free</Button>
						<Button variant="secondary" href="/docs/self-host">
							Self-host
						</Button>
					</div>
				</div>
			</main>
			<Footer />
		</>
	);
}
