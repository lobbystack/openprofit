import { useState } from "react";
import { Button } from "#/components/ui/button";

// Badge preview and copy-paste snippets for a public product page. `page`
// is the page's address; a path resolves against this site, in the browser.
export function BadgeEmbed({
	page,
	product,
}: {
	page: string;
	product: string;
}) {
	const url = page.startsWith("/") ? `${location.origin}${page}` : page;
	const img = `${url}/badge.svg`;
	const alt = `${product} on OpenProfit`;
	const snippets: [string, string][] = [
		["Markdown", `[![${alt}](${img})](${url})`],
		[
			"HTML",
			`<a href="${url}"><img src="${img}" alt="${alt}" height="20"></a>`,
		],
	];
	return (
		<div className="space-y-3">
			<img src={img} alt={alt} height={20} style={{ height: 20 }} />
			{snippets.map(([label, code]) => (
				<Snippet key={label} label={label} code={code} />
			))}
		</div>
	);
}

function Snippet({ label, code }: { label: string; code: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<div>
			<div className="flex items-center justify-between">
				<span className="text-[12px] text-text-2">{label}</span>
				<Button
					variant="ghost"
					size="xs"
					onClick={() =>
						navigator.clipboard.writeText(code).then(() => {
							setCopied(true);
							setTimeout(() => setCopied(false), 1500);
						})
					}
				>
					{copied ? "Copied" : "Copy"}
				</Button>
			</div>
			<pre className="mt-1 overflow-x-auto rounded-md border border-line bg-paper px-3 py-2 text-[12px] whitespace-pre-wrap break-all">
				{code}
			</pre>
		</div>
	);
}
