export const APP_NAME = "OpenProfit";
export const APP_TAGLINE = "Finance for developers";
export const APP_DOMAIN = "openprofit.dev";
export const GITHUB_URL = "https://github.com/morencyr/openprofit";
export const SITE_URL = "https://openprofit.dev";
export const SITE_DESCRIPTION =
	"Open-source app that puts your revenue next to your OpenAI, Vercel and other bills, shows profit per app, and gives you the numbers for your tax return.";

// Answers to onboarding's "Where did you hear about OpenProfit?", sent with
// workspace_created so signups can be counted per channel.
export const HEARD_FROM = [
	"reddit",
	"x",
	"tiktok",
	"google",
	"ai",
	"hacker_news",
	"github",
	"friend",
	"other",
] as const;
export const HEARD_FROM_LABELS: Record<(typeof HEARD_FROM)[number], string> = {
	reddit: "Reddit",
	x: "X",
	tiktok: "TikTok",
	google: "Google search",
	ai: "ChatGPT, Claude or another AI",
	hacker_news: "Hacker News",
	github: "GitHub",
	friend: "A friend or colleague",
	other: "Other",
};

// Title, description, canonical and social tags for a public page. `image`
// replaces the root's 1200x630 social image.
export function seo({
	title,
	description = SITE_DESCRIPTION,
	path,
	image,
}: {
	title: string;
	description?: string;
	path: string;
	image?: string;
}) {
	const url = `${SITE_URL}${path}`;
	return {
		meta: [
			...(image
				? [
						{ property: "og:image", content: image },
						{ name: "twitter:image", content: image },
					]
				: []),
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

// Where to go after signing in (`?redirect=`): a path on this site, never
// another host. Browsers drop tabs and newlines from URLs, so "/\t/x.com"
// would become "//x.com"; control characters are out, and the path has to
// parse back to this origin the way a browser reads it.
export function isLocalPath(p: string) {
	if (!/^\/(?![/\\])/.test(p) || [...p].some((c) => c < " " || c === "\x7f"))
		return false;
	try {
		return new URL(p, "http://x").origin === "http://x";
	} catch {
		return false;
	}
}
