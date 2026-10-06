import { Check } from "lucide-react";
import { Button, Container, Section, SectionHeader } from "./primitives";

const PLANS = [
	{
		name: "Free",
		price: "$0",
		note: "Under $2,500 MRR",
		features: [
			"Every connector",
			"Unlimited products",
			"Sync every 6 hours",
			"12 months of history",
			"Weekly email and alerts",
			"Public pages",
		],
		cta: "Start for free",
		primary: false,
	},
	{
		name: "Indie",
		price: "$19",
		note: "Up to $25,000 MRR",
		features: ["Everything in Free", "Sync every hour", "24 months of history"],
		cta: "Start for free",
		primary: true,
	},
	{
		name: "Pro",
		price: "$49",
		note: "Above $25,000 MRR",
		features: [
			"Everything in Indie",
			"Sync every 15 minutes",
			"Priority support",
		],
		cta: "Start for free",
		primary: false,
	},
];

export function Pricing() {
	return (
		<Section>
			<Container className="py-24">
				<div id="pricing">
					<SectionHeader align="center" title="Free until you make money">
						Free while your products make under $2,500 a month combined. After
						that, a flat price that never grows with your revenue. Every
						connector on every plan.
					</SectionHeader>
				</div>
				<div className="mt-14 grid gap-3 md:grid-cols-3">
					{PLANS.map((p) => (
						<div
							key={p.name}
							className={`flex flex-col rounded-xl border bg-card p-6 ${
								p.primary ? "border-line-strong" : "border-line"
							}`}
						>
							<div className="text-[14px]">{p.name}</div>
							<div className="num mt-4 text-[40px] leading-none">
								{p.price}
								<span className="ml-1 text-[14px] text-text-3">/ mo</span>
							</div>
							<div className="mt-2 text-[13px] text-text-2">{p.note}</div>
							<ul className="mt-6 space-y-2.5 text-[13px]">
								{p.features.map((f) => (
									<li key={f} className="flex items-center gap-2">
										<Check size={14} className="text-text-2" />
										{f}
									</li>
								))}
							</ul>
							<div className="mt-8">
								<Button
									variant={p.primary ? "primary" : "secondary"}
									href="/login"
									className="w-full"
								>
									{p.cta}
								</Button>
							</div>
						</div>
					))}
				</div>
				<p className="mt-6 text-center text-[13px] text-text-3">
					Self-hosted is free at any revenue. Prices in USD, billed through
					Polar.
				</p>
			</Container>
		</Section>
	);
}
