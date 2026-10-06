import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "#/components/landing/footer";
import { Nav } from "#/components/landing/nav";
import {
	PROVIDERS,
	type ProviderId,
	ProviderLogo,
} from "#/components/provider-logo";
import { seo } from "#/lib/app";
import { INTEGRATIONS } from "#/lib/content";

export const Route = createFileRoute("/integrations/")({
	head: () =>
		seo({
			title: "Integrations · OpenProfit",
			description:
				"Connect Stripe, Paddle, Lemon Squeezy, OpenAI, Anthropic, Vercel, Neon and 12 more providers to see revenue, costs and profit per product.",
			path: "/integrations",
		}),
	component: Integrations,
});

function Integrations() {
	return (
		<>
			<Nav />
			<main className="mx-auto w-full max-w-[1024px] px-4 pt-28 pb-24">
				<h1 className="display text-[36px]">Integrations</h1>
				<p className="prose-landing mt-3 max-w-[560px]">
					Revenue from your payment processor, costs from the services you pay
					for. Each takes a read-only key.
				</p>
				{(["revenue", "cost"] as const).map((kind) => (
					<section key={kind} className="mt-12">
						<h2 className="label-mono">
							{kind === "revenue" ? "Revenue" : "Costs"}
						</h2>
						<div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
							{INTEGRATIONS.filter((p) => p.meta.kind === kind).map((p) => (
								<Link
									key={p.slug}
									to="/integrations/$slug"
									params={{ slug: p.slug }}
									className="rounded-xl border border-line bg-card p-5 transition-colors duration-150 hover:border-line-strong"
								>
									<div className="flex items-center gap-2 text-[15px]">
										{PROVIDERS[p.slug] && (
											<ProviderLogo id={p.slug as ProviderId} size={16} />
										)}
										{p.meta.name}
									</div>
									<p className="mt-2 text-[13px] text-text-2">
										{p.meta.summary}
									</p>
								</Link>
							))}
						</div>
					</section>
				))}
			</main>
			<Footer />
		</>
	);
}
