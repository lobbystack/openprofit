import { Logo } from "#/components/logo";
import { GITHUB_URL } from "#/lib/app";
import { Container, Href } from "./primitives";

const COLUMNS: [string, [string, string][]][] = [
	[
		"Product",
		[
			["Integrations", "/integrations"],
			["Public pages", "/docs/public-pages"],
			["Pricing", "/#pricing"],
			["Changelog", "/changelog"],
		],
	],
	[
		"Developers",
		[
			["Docs", "/docs"],
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
		],
	],
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
							Revenue, costs and profit for every product you run.
						</p>
					</div>
					{COLUMNS.map(([title, links]) => (
						<div key={title}>
							<h3 className="text-[14px] font-medium">{title}</h3>
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
				<div className="mt-16 flex items-center justify-between border-t border-line pt-6 text-[13px] text-text-2">
					<span>MIT licensed</span>
					<span>© 2026 Lobbystack Inc.</span>
				</div>
			</Container>
		</footer>
	);
}
