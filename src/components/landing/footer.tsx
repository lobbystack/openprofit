import { Logo } from "#/components/logo";
import { GITHUB_URL } from "#/lib/app";
import { Container, Href } from "./primitives";

const COLUMNS: [string, [string, string][]][] = [
	[
		"Product",
		[
			["Integrations", "/integrations"],
			["Public pages", "/docs/public-pages"],
			["Profit database", "/open"],
			["Benchmarks", "/data"],
			["Pricing", "/#pricing"],
			["Changelog", "/changelog"],
			["Blog", "/blog"],
		],
	],
	[
		"Developers",
		[
			["Docs", "/docs/connectors"],
			["Self-host", "/docs/self-host"],
			["GitHub", GITHUB_URL],
		],
	],
	[
		"Compare",
		[
			["vs ProfitWell", "/compare/profitwell"],
			["vs Baremetrics", "/compare/baremetrics"],
			["vs a spreadsheet", "/compare/spreadsheet"],
		],
	],
	[
		"Legal",
		[
			["Privacy", "/privacy"],
			["Terms", "/terms"],
			["Cookies", "/cookies"],
			["Security", "/security"],
		],
	],
];

// Directory badges. Twelve Tools keeps its dofollow link only while its badge
// is on the site. Each badge has a light and a dark image for the two themes.
const BADGES: { name: string; href: string; light: string; dark: string }[] = [
	{
		name: "Featured on DevHunt",
		href: "https://devhunt.org/tool/openprofit",
		light: "https://devhunt.org/badge/openprofit.svg?theme=light",
		dark: "https://devhunt.org/badge/openprofit.svg",
	},
	{
		name: "Featured on Twelve Tools",
		href: "https://twelve.tools",
		light: "https://twelve.tools/badge0-light.svg",
		dark: "https://twelve.tools/badge0-dark.svg",
	},
];

// 1024px wide, brand column plus link columns with 14px titles.
export function Footer() {
	return (
		<footer className="border-t border-line">
			<Container width={1024} className="py-16">
				<div className="grid gap-10 md:grid-cols-[1fr_repeat(4,150px)]">
					<div>
						<Logo />
						<p className="mt-3 max-w-[240px] text-[13px] text-text-2">
							Revenue, costs and profit for every app you run.
						</p>
					</div>
					{COLUMNS.map(([title, links]) => (
						<div key={title}>
							<h2 className="text-[14px] font-medium">{title}</h2>
							<ul className="mt-4 space-y-2.5">
								{links.map(([label, href]) => (
									<li key={label}>
										<Href
											href={href}
											className="text-[14px] text-text-2 hover:text-ink"
										>
											{label}
										</Href>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
				<div className="mt-12 flex flex-wrap items-center gap-3">
					{BADGES.map((b) => (
						<a key={b.name} href={b.href} target="_blank" rel="noopener">
							<img
								src={b.light}
								alt={b.name}
								width={148}
								height={40}
								loading="lazy"
								className="h-10 w-auto dark:hidden"
							/>
							<img
								src={b.dark}
								alt={b.name}
								width={148}
								height={40}
								loading="lazy"
								className="hidden h-10 w-auto dark:block"
							/>
						</a>
					))}
				</div>
				<div className="mt-12 flex items-center justify-between border-t border-line pt-6 text-[13px] text-text-2">
					<span>MIT licensed</span>
					<span>© 2026 Lobbystack Inc.</span>
				</div>
			</Container>
		</footer>
	);
}
