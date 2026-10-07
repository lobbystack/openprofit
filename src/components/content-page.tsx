import { Footer } from "#/components/landing/footer";
import { Nav } from "#/components/landing/nav";
import { Href } from "#/components/landing/primitives";
import { buttonVariants } from "#/components/ui/button";

// Marketing article: nav, rendered markdown, a closing call to action.
export function ContentPage({
	html,
	cta = "See revenue, costs and profit for every product you run.",
	children,
}: {
	html: string;
	cta?: string;
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
					<p className="text-[15px]">{cta}</p>
					<div className="flex gap-3">
						<Href
							href="/login"
							className={buttonVariants({ size: "lg", weight: "medium" })}
						>
							Start for free
						</Href>
						<Href
							href="/docs/self-host"
							className={buttonVariants({
								variant: "outline",
								size: "lg",
								weight: "medium",
							})}
						>
							Self-host
						</Href>
					</div>
				</div>
			</main>
			<Footer />
		</>
	);
}
