import { parse } from "./content";

const files = import.meta.glob("../docs/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const ORDER = [
	"self-host",
	"connectors",
	"environment",
	"public-pages",
	"billing",
];

// Title comes from the page's H1; the sidebar uses `navLabel`.
export const DOCS = ORDER.map((slug) => {
	const raw = files[`../docs/${slug}.md`] ?? "";
	const page = parse(slug, raw);
	const h1 = raw.match(/^# (.+)$/m)?.[1] ?? slug;
	return {
		slug,
		title: h1,
		navLabel: page.meta.navLabel ?? h1,
		description: page.description,
		html: page.html,
		body: page.body,
	};
});
