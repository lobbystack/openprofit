import { buttonVariants } from "#/components/ui/button";
import { Container, Href } from "./primitives";

// Dark band, centered 48px heading, 20px paragraph at 560px, two buttons.
export function Cta() {
	return (
		<section className="bg-ink text-paper dark:bg-surface-2 dark:text-ink">
			<Container className="flex flex-col items-center py-32 text-center">
				<h2 className="display max-w-[512px] text-[48px]">
					Know what your software makes, after costs
				</h2>
				<p className="mt-5 max-w-[560px] text-[18px] leading-[28px] text-paper/60 dark:text-text-2">
					Connect in two minutes. Free under $2,500 MRR.
				</p>
				<div className="mt-8 flex gap-3">
					<Href
						href="/login"
						className={buttonVariants({
							variant: "paper",
							size: "lg",
							weight: "medium",
						})}
					>
						Start for free
					</Href>
					<Href
						href="/docs/self-host"
						className={buttonVariants({
							variant: "translucent",
							size: "lg",
							weight: "medium",
						})}
					>
						Self-host
					</Href>
				</div>
			</Container>
		</section>
	);
}
