import home from "#/content/home.md?raw";
import { CHANGELOG, COMPARISONS, INTEGRATIONS } from "#/lib/content";
import { DOCS } from "#/lib/docs";
import { LEGAL_MD } from "#/lib/legal";

const integrationsIndex = [
	"# Integrations",
	"",
	"Revenue from your payment processor, costs from the services you pay for. Each takes a read-only key.",
	"",
	...INTEGRATIONS.map(
		(p) =>
			`- [${p.meta.name}](https://openprofit.dev/integrations/${p.slug}) (${p.meta.kind}): ${p.meta.summary}`,
	),
].join("\n");

// Markdown version of a public page, or null when the page has none.
export function markdownFor(path: string): string | null {
	const p = path.replace(/\/+$/, "") || "/";
	if (p === "/") return home;
	if (p === "/integrations") return integrationsIndex;
	if (p === "/changelog") return CHANGELOG.body;
	if (p === "/privacy") return LEGAL_MD.privacy;
	if (p === "/terms") return LEGAL_MD.terms;
	const [, section, slug] = p.split("/");
	const list =
		section === "docs"
			? DOCS
			: section === "integrations"
				? INTEGRATIONS
				: section === "compare"
					? COMPARISONS
					: null;
	return list?.find((x) => x.slug === slug)?.body ?? null;
}
