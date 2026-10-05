import { Container, Section, SectionHeader } from "./primitives";

const ENTRIES = [
	{
		date: "Oct 5, 2026",
		title: "Design system and landing page",
		text: "Tokens, type and the first page.",
	},
	{
		date: "Oct 3, 2026",
		title: "Project started",
		text: "Market research, the decision tree and the v1 cut line. Everything is in the open from day one.",
	},
];

// 36px title left with button, two changelog cards right.
export function Changelog() {
	return (
		<Section>
			<Container className="grid gap-10 py-24 md:grid-cols-[384px_1fr] md:gap-16">
				<SectionHeader
					title="Built in public."
					size={36}
					cta="Full changelog"
					href="/changelog"
				>
					Every change ships with a note. Every number on our own open page is
					real.
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
