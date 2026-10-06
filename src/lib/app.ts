export const APP_NAME = "OpenProfit";
export const APP_TAGLINE = "Finance for developers";
export const APP_DOMAIN = "openprofit.dev";
export const GITHUB_URL = "https://github.com/lobbystack/openprofit";
export const SITE_URL = "https://openprofit.dev";
export const SITE_DESCRIPTION =
	"Open-source dashboard that puts your Stripe or Paddle revenue next to your OpenAI, Vercel and other bills, and shows profit per product.";

// Title, description, canonical and social tags for a public page.
export function seo({
	title,
	description = SITE_DESCRIPTION,
	path,
}: {
	title: string;
	description?: string;
	path: string;
}) {
	const url = `${SITE_URL}${path}`;
	return {
		meta: [
			{ title },
			{ name: "description", content: description },
			{ property: "og:title", content: title },
			{ property: "og:description", content: description },
			{ property: "og:url", content: url },
			{ name: "twitter:title", content: title },
			{ name: "twitter:description", content: description },
		],
		links: [{ rel: "canonical", href: url }],
	};
}

export const NOINDEX = { meta: [{ name: "robots", content: "noindex" }] };
