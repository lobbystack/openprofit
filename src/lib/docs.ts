import { marked } from "marked";

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

export const DOCS = ORDER.map((slug) => {
	const markdown = files[`../docs/${slug}.md`] ?? "";
	const title = markdown.match(/^# (.+)$/m)?.[1] ?? slug;
	return { slug, title, markdown };
});

export const renderDoc = (markdown: string) =>
	marked.parse(markdown, { async: false }) as string;
