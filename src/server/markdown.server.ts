import home from "#/content/home.md?raw";
import { CHANGELOG, COMPARISONS, DATA, INTEGRATIONS } from "#/lib/content";
import { DOCS } from "#/lib/docs";
import { LEGAL_MD } from "#/lib/legal";

const integrationsIndex = [
	"# Integrations",
	"",
	"Revenue from your payment processor, costs from the services you pay for. Each connection uses an API key with the narrowest access the provider offers, and OpenProfit only reads with it.",
	"",
	...INTEGRATIONS.map(
		(p) =>
			`- [${p.meta.name}](https://openprofit.dev/integrations/${p.slug}) (${p.meta.kind}): ${p.meta.summary}`,
	),
].join("\n");

// Markdown version of a public page, or null when the page has none.
// Pages with live data (/open, /p/...) need the database, which this file
// can't import, so their routes answer `Accept: text/markdown` themselves.
export function markdownFor(path: string): string | null {
	const p = path.replace(/\/+$/, "") || "/";
	if (p === "/") return home;
	if (p === "/integrations") return integrationsIndex;
	if (p === "/changelog") return CHANGELOG.body;
	if (p === "/privacy") return LEGAL_MD.privacy;
	if (p === "/terms") return LEGAL_MD.terms;
	if (p === "/cookies") return LEGAL_MD.cookies;
	if (p === "/security") return LEGAL_MD.security;
	// Hosted only, and never prerendered: the page shows live figures, the
	// markdown points to the files.
	if (p === "/data")
		return process.env.APP_MODE === "cloud"
			? `# ${DATA.title}\n\n${DATA.description}\n\n${DATA.body}`
			: null;
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
