import { createFileRoute } from "@tanstack/react-router";
import { Changelog } from "#/components/landing/changelog";
import { Connectors } from "#/components/landing/connectors";
import { Cta } from "#/components/landing/cta";
import {
	FeatureCosts,
	FeatureProfit,
	FeatureWeekly,
} from "#/components/landing/features";
import { Footer } from "#/components/landing/footer";
import { Hero } from "#/components/landing/hero";
import { Nav } from "#/components/landing/nav";
import { OpenSource } from "#/components/landing/open-source";
import { Pricing } from "#/components/landing/pricing";
import { SITE_DESCRIPTION, SITE_URL, seo } from "#/lib/app";

const LD = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "SoftwareApplication",
			name: "OpenProfit",
			applicationCategory: "FinanceApplication",
			operatingSystem: "Web",
			url: SITE_URL,
			description: SITE_DESCRIPTION,
			offers: [
				{ "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
				{ "@type": "Offer", name: "Indie", price: "19", priceCurrency: "USD" },
				{ "@type": "Offer", name: "Pro", price: "49", priceCurrency: "USD" },
			],
		},
		{
			"@type": "Organization",
			name: "Lobbystack Inc.",
			url: SITE_URL,
			logo: `${SITE_URL}/apple-touch-icon.png`,
			sameAs: ["https://github.com/lobbystack/openprofit"],
		},
	],
};

export const Route = createFileRoute("/")({
	head: () => ({
		...seo({
			title: "OpenProfit: open-source profit dashboard for developers",
			path: "/",
		}),
		scripts: [{ type: "application/ld+json", children: JSON.stringify(LD) }],
	}),
	component: Landing,
});

function Landing() {
	return (
		<>
			<Nav />
			<main>
				<Hero />
				<Connectors />
				<FeatureProfit />
				<FeatureCosts />
				<FeatureWeekly />
				<OpenSource />
				<Pricing />
				<Changelog />
				<Cta />
			</main>
			<Footer />
		</>
	);
}
