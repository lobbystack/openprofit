import { createFileRoute } from "@tanstack/react-router";
import { SITE_DESCRIPTION, SITE_URL } from "#/lib/app";
import { COMPARISONS, DATA, INTEGRATIONS, POSTS } from "#/lib/content";
import { DOCS } from "#/lib/docs";

const item = (title: string, path: string, about: string) =>
	`- [${title}](${SITE_URL}${path})${about ? `: ${about}` : ""}`;

// The site map for AI agents, in the llms.txt format (https://llmstxt.org).
const BODY = [
	"# OpenProfit",
	"",
	`> ${SITE_DESCRIPTION}`,
	"",
	`OpenProfit is open source under the MIT license and runs as one Docker image. Request any page below with \`Accept: text/markdown\` to get it as markdown, or read them all at ${SITE_URL}/llms-full.txt.`,
	"",
	"## Product",
	"",
	item("OpenProfit", "/", "What it does, the connectors, and pricing"),
	item(
		"Security",
		"/security",
		"The API key each provider needs and what OpenProfit does with it",
	),
	item(
		"Profit database",
		"/open",
		"Revenue, costs and profit from products that publish their numbers, read from Stripe, OpenAI, Vercel and other provider APIs",
	),
	item(DATA.title, "/data", DATA.description),
	"",
	"## Docs",
	"",
	...DOCS.map((d) => item(d.title, `/docs/${d.slug}`, d.description)),
	"",
	"## Integrations",
	"",
	...INTEGRATIONS.map((p) =>
		item(p.meta.name, `/integrations/${p.slug}`, p.meta.summary),
	),
	"",
	"## Comparisons",
	"",
	...COMPARISONS.map((p) => item(p.title, `/compare/${p.slug}`, p.description)),
	"",
	"## Blog",
	"",
	...POSTS.map((p) => item(p.title, `/blog/${p.slug}`, p.description)),
	"",
	"## Optional",
	"",
	item("Changelog", "/changelog", ""),
	item("Privacy policy", "/privacy", ""),
	item("Terms of service", "/terms", ""),
	"",
].join("\n");

export const Route = createFileRoute("/llms.txt")({
	server: {
		handlers: {
			GET: () =>
				new Response(BODY, {
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				}),
		},
	},
});
