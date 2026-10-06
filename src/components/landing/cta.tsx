import { Button, Container } from "./primitives";

// Dark band, centered 48px heading, 20px paragraph at 560px, two buttons.
export function Cta() {
	return (
		<section className="bg-ink text-paper dark:bg-surface-2 dark:text-ink">
			<Container className="flex flex-col items-center py-32 text-center">
				<h2 className="max-w-[512px] text-[48px] leading-[1]">
					Know what your software makes, after costs
				</h2>
				<p className="mt-5 max-w-[560px] text-[18px] leading-[28px] text-paper/60 dark:text-text-2">
					Connect in two minutes. Free under $2,500 a month.
				</p>
				<div className="mt-8 flex gap-3">
					<Button variant="paper" href="/login">
						Start for free
					</Button>
					<Button variant="translucent" href="/docs/self-host">
						Self-host
					</Button>
				</div>
			</Container>
		</section>
	);
}
