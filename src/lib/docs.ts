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
	// First paragraph after the title, plain text, for the meta description.
	const description = (markdown.split(/\n\n/)[1] ?? "")
		.replace(/[`*_[\]]|\(.*?\)/g, "")
		.slice(0, 160);
	return { slug, title, description, markdown };
});

export const renderDoc = (markdown: string) =>
	marked.parse(markdown, { async: false }) as string;
