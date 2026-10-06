import { PROVIDERS, type ProviderId, ProviderLogo } from "../provider-logo";
import { Container, Section, SectionHeader } from "./primitives";

const TILES: ProviderId[] = [
	"stripe",
	"polar",
	"openai",
	"anthropic",
	"vercel",
	"cloudflare",
	"railway",
	"supabase",
	"resend",
	"paddle",
	"lemonsqueezy",
	"appstore",
];

// Muted band, text column of 384px on
// the left, a wide field of logo tiles on the right.
export function Connectors() {
	return (
		<Section muted className="overflow-clip">
			<Container className="grid items-center gap-10 py-20 md:grid-cols-[384px_1fr]">
				<div id="connectors">
					<SectionHeader
						title="Connect your whole stack"
						size={40}
						cta="All connectors"
						href="/integrations"
					>
						Revenue from your payment processor. Costs from your AI providers,
						hosting and infrastructure. Paste a read-only key and two years of
						history fill in.
					</SectionHeader>
				</div>
				<div className="relative h-[300px]">
					<div className="absolute inset-y-0 right-0 left-0 grid grid-cols-4 content-center gap-3 md:-right-24 md:grid-cols-6">
						{TILES.map((id, i) => {
							const p = PROVIDERS[id];
							const offset = i % 2 === 0 ? "translate-y-4" : "-translate-y-4";
							return (
								<div
									key={id}
									title={p.name}
									className={`flex h-20 items-center justify-center rounded-xl border border-line bg-paper ${offset} ${
										p.v1 ? "text-ink" : "text-text-3"
									}`}
								>
									<ProviderLogo id={id} size={26} />
								</div>
							);
						})}
					</div>
				</div>
			</Container>
		</Section>
	);
}
