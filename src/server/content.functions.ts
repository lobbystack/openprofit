import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CHANGELOG, COMPARISONS, INTEGRATIONS } from "#/lib/content";
import { DOCS } from "#/lib/docs";
import { LEGAL } from "#/lib/legal";

// Markdown pages render on the server, so the markdown files and the parser
// stay out of the browser bundle. Loaders call these.

type Page = { slug: string; title: string; description: string; html: string };
const page = ({ slug, title, description, html }: Page): Page => ({
	slug,
	title,
	description,
	html,
});

export const getContentPage = createServerFn({ method: "GET" })
	.validator(
		z.object({
			section: z.enum(["docs", "integrations", "compare"]),
			slug: z.string(),
		}),
	)
	.handler(({ data }) => {
		const list =
			data.section === "docs"
				? DOCS
				: data.section === "integrations"
					? INTEGRATIONS
					: COMPARISONS;
		const p = list.find((x) => x.slug === data.slug);
		if (!p) throw notFound();
		return page(p);
	});

export const getChangelog = createServerFn({ method: "GET" }).handler(() =>
	page(CHANGELOG),
);

export const getLegalPage = createServerFn({ method: "GET" })
	.validator(z.enum(["privacy", "terms", "cookies"]))
	.handler(({ data }) => LEGAL[data]);

export const getIntegrations = createServerFn({ method: "GET" }).handler(() =>
	INTEGRATIONS.map((p) => ({
		slug: p.slug,
		name: p.meta.name,
		kind: p.meta.kind,
		summary: p.meta.summary,
	})),
);

export const getDocsNav = createServerFn({ method: "GET" }).handler(() =>
	DOCS.map((d) => ({ slug: d.slug, navLabel: d.navLabel })),
);
