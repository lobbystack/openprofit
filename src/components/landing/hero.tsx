import { ArrowRight } from "lucide-react";
import { GITHUB_URL } from "#/lib/app";
import { DashboardPreview } from "../dashboard/dashboard-preview";
import { Button, Container } from "./primitives";

const CHIPS = [
	["Revenue", "bg-ink"],
	["Costs", "bg-negative"],
	["Profit", "bg-positive"],
];

// Centered hero (pill, H1, 20px paragraph, two 38px buttons), then a
// full-width muted band holding three chips and the product, clipped at the bottom.
export function Hero() {
	return (
		<>
			<section className="pt-14">
				<Container className="flex flex-col items-center pt-16 pb-12 text-center">
					<a
						href={GITHUB_URL}
						className="flex h-[30px] items-center gap-2 rounded-full border border-line-strong bg-paper pr-1 pl-3 text-[12px] font-medium"
					>
						Open source, MIT licensed
						<span className="flex h-[22px] items-center gap-1 rounded-full bg-surface-2 px-2 text-text-2">
							GitHub
							<ArrowRight size={12} />
						</span>
					</a>
					<h1 className="mt-6 max-w-[760px] text-[40px] leading-[1.05] md:text-[56px]">
						Know if your software makes money.
					</h1>
					<p className="prose-landing mt-5 max-w-[640px] text-[20px] leading-[28px]">
						Connect Stripe or Polar and the services you pay for. See revenue,
						costs and profit for every product you run, updated every hour.
					</p>
					<div className="mt-8 flex gap-3">
						<Button href="/signup">Start for free</Button>
						<Button variant="secondary" href="/docs/self-host">
							Self-host
						</Button>
					</div>
				</Container>
			</section>

			<section className="overflow-clip border-b border-line bg-surface-1">
				<Container className="relative">
					<div className="flex justify-center gap-2 pt-6">
						{CHIPS.map(([label, bg]) => (
							<span
								key={label}
								className="flex h-8 items-center gap-2 rounded-md border border-line bg-paper px-3 text-[13px]"
							>
								<span className={`h-3 w-3 rounded-[3px] ${bg}`} />
								{label}
							</span>
						))}
					</div>
					<div className="mx-auto mt-6 h-[580px] max-w-[940px] overflow-hidden">
						<div className="w-[940px] max-w-none md:w-auto">
							<DashboardPreview />
						</div>
					</div>
				</Container>
			</section>
		</>
	);
}
