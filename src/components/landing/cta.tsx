import { Button, Container } from "./primitives";

// Dark band, centered 48px heading, 20px paragraph at 560px, two buttons.
export function Cta() {
	return (
		<section className="bg-ink text-paper">
			<Container className="flex flex-col items-center py-32 text-center">
				<h2 className="max-w-[512px] text-[48px] leading-[1]">
					Know if your software makes money.
				</h2>
				<p className="mt-5 max-w-[560px] font-serif text-[20px] leading-[28px] text-paper/60">
					Two minutes to connect, one number to watch. Free under $2,500 a
					month.
				</p>
				<div className="mt-8 flex gap-3">
					<Button variant="paper" href="/signup">
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
