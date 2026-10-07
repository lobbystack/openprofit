import { ArrowRight } from "lucide-react";
import { buttonVariants } from "#/components/ui/button";
import { GITHUB_URL } from "#/lib/app";
import { DashboardPreview } from "../dashboard/dashboard-preview";
import { Container, Href } from "./primitives";

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
						className="rise flex h-[30px] items-center gap-2 rounded-full border border-line-strong bg-paper pr-1 pl-3 text-[12px] font-medium"
					>
						Open source, MIT licensed
						<span className="flex h-[22px] items-center gap-1 rounded-full bg-surface-2 px-2 text-text-2">
							GitHub
							<ArrowRight size={12} />
						</span>
					</a>
					<h1
						className="rise display mt-6 max-w-[760px] text-[40px] md:text-[56px]"
						style={{ "--rise-delay": "60ms" } as React.CSSProperties}
					>
						Finance for developers
					</h1>
					<p
						className="rise prose-landing mt-5 max-w-[640px]"
						style={{ "--rise-delay": "120ms" } as React.CSSProperties}
					>
						OpenProfit is the open-source finance dashboard for developers. It
						brings your revenue and every bill you pay into one place, so you
						know what each product earns after costs.
					</p>
					<div
						className="rise mt-8 flex gap-3"
						style={{ "--rise-delay": "180ms" } as React.CSSProperties}
					>
						<Href
							href="/login"
							className={buttonVariants({ size: "lg", weight: "medium" })}
						>
							Start for free
						</Href>
						<Href
							href="/demo"
							className={buttonVariants({
								variant: "outline",
								size: "lg",
								weight: "medium",
							})}
						>
							Try the live demo
						</Href>
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
