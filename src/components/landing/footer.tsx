import { APP_NAME, GITHUB_URL } from "#/lib/app";
import { Container } from "./primitives";

const COLUMNS: [string, [string, string][]][] = [
	[
		"Product",
		[
			["Connectors", "/docs/connectors"],
			["Public pages", "/docs/public-pages"],
			["Pricing", "/#pricing"],
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
];

// 1024px wide, brand column plus link columns with 14px titles.
export function Footer() {
	return (
		<footer className="border-t border-line">
			<Container width={1024} className="py-16">
				<div className="grid gap-10 md:grid-cols-[1fr_repeat(2,160px)]">
					<div>
						<div className="text-[15px]">{APP_NAME}</div>
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
										<a
											href={href}
											className="text-[14px] text-text-2 hover:text-ink"
										>
											{label}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
				<div className="mt-16 flex items-center justify-between border-t border-line pt-6 text-[13px] text-text-2">
					<span>MIT licensed</span>
					<span>© 2026 {APP_NAME}</span>
				</div>
			</Container>
		</footer>
	);
}
