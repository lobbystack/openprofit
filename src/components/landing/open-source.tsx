import { Container, Section, SectionHeader } from "./primitives";

const STATS = [
	["MIT", "License"],
	["1", "Container to self-host"],
	["12", "Connectors"],
	["$0", "Under $2.5K MRR"],
];

// Muted band, 304px text column left, numbers right.
export function OpenSource() {
	return (
		<Section muted>
			<Container className="grid gap-10 py-24 md:grid-cols-[304px_1fr] md:gap-20">
				<SectionHeader
					title="Open source. Self-host it if you'd rather."
					size={36}
					cta="Read the source"
					href="https://github.com"
				>
					One Docker image, SQLite by default, Postgres if you want it. Your
					Stripe keys never leave your server.
				</SectionHeader>
				<div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
					{STATS.map(([n, l]) => (
						<div key={l} className="bg-paper p-8">
							<div className="num text-[48px] leading-none">{n}</div>
							<div className="mt-3 text-[14px] text-text-2">{l}</div>
						</div>
					))}
				</div>
			</Container>
		</Section>
	);
}
