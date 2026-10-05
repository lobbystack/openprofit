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

export const Route = createFileRoute("/")({ component: Landing });

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
