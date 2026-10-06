import "@tanstack/react-start/server-only";
import { Marked } from "marked";

// Headings get ids from their text, so links like
// /docs/connectors#sales-tax-and-vat land on the section.
const marked = new Marked({
	renderer: {
		heading({ tokens, depth, text }) {
			const id = text
				.toLowerCase()
				.replace(/[^\w\s-]/g, "")
				.trim()
				.replace(/\s+/g, "-");
			return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
		},
	},
});

export function toHtml(md: string) {
	return marked.parse(md, { async: false }) as string;
}

// Markdown pages with a small front matter block: `key: value` lines
// between two `---` fences.
export type Page = {
	slug: string;
	title: string;
	description: string;
	html: string;
	// Markdown body without the front matter, served to agents.
	body: string;
	meta: Record<string, string>;
};

export function parse(slug: string, raw: string): Page {
	const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	const meta: Record<string, string> = {};
	for (const line of (m?.[1] ?? "").split("\n")) {
		const i = line.indexOf(":");
		if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
	}
	return {
		slug,
		title: meta.title ?? slug,
		description: meta.description ?? "",
		html: toHtml(m?.[2] ?? raw),
		body: (m?.[2] ?? raw).trim(),
		meta,
	};
}

const load = (files: Record<string, string>) =>
	Object.entries(files).map(([path, raw]) =>
		parse(path.split("/").pop()?.replace(/\.md$/, "") ?? path, raw),
	);

const order = <T extends { slug: string }>(pages: T[], slugs: string[]) =>
	slugs.flatMap((s) => pages.find((p) => p.slug === s) ?? []);

export const INTEGRATIONS = order(
	load(
		import.meta.glob("../content/integrations/*.md", {
			query: "?raw",
			import: "default",
			eager: true,
		}) as Record<string, string>,
	),
	[
		"stripe",
		"polar",
		"paddle",
		"lemonsqueezy",
		"revenuecat",
		"openai",
		"anthropic",
		"openrouter",
		"xai",
		"vercel",
		"cloudflare",
		"railway",
		"digitalocean",
		"github",
		"twilio",
		"firecrawl",
		"resend",
		"neon",
		"mongodb",
	],
);

export const COMPARISONS = load(
	import.meta.glob("../content/compare/*.md", {
		query: "?raw",
		import: "default",
		eager: true,
	}) as Record<string, string>,
);

export const CHANGELOG = load(
	import.meta.glob("../content/changelog.md", {
		query: "?raw",
		import: "default",
		eager: true,
	}) as Record<string, string>,
)[0];
