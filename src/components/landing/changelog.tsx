import { Container, Section, SectionHeader } from "./primitives";

const ENTRIES = [
	{
		date: "Oct 6, 2026",
		title: "Paddle, Lemon Squeezy and RevenueCat",
		text: "Three new revenue sources, with refunds, MRR and active subscriptions.",
	},
	{
		date: "Oct 6, 2026",
		title: "Period picker and dark mode",
		text: "Compare any period with the one before it. Dark mode follows your system.",
	},
];

// 36px title left with button, two changelog cards right.
export function Changelog() {
	return (
		<Section>
			<Container className="grid gap-10 py-24 md:grid-cols-[384px_1fr] md:gap-16">
				<SectionHeader
					title="We ship in the open"
					size={36}
					cta="Full changelog"
					href="/changelog"
				>
					Every release ships with a note, and the code is on GitHub from the
					first commit.
				</SectionHeader>
				<div className="grid gap-3 md:grid-cols-2">
					{ENTRIES.map((e) => (
						<a
							key={e.title}
							href="/changelog"
							className="rounded-xl border border-line bg-card p-6 transition-colors duration-150 hover:border-line-strong"
						>
							<div className="label-mono">{e.date}</div>
							<div className="mt-3 text-[15px]">{e.title}</div>
							<p className="mt-2 text-[13px] text-text-2">{e.text}</p>
						</a>
					))}
				</div>
			</Container>
		</Section>
	);
}
