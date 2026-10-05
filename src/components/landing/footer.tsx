import { APP_NAME } from "#/lib/app";
import { Container } from "./primitives";

const COLUMNS: [string, string[]][] = [
	["Product", ["Dashboard", "Connectors", "Alerts", "Public pages", "Pricing"]],
	["Developers", ["Docs", "Self-host", "GitHub", "Changelog", "Status"]],
	["Company", ["About", "Open page", "X", "Contact"]],
	["Legal", ["Privacy", "Terms"]],
];

// 1024px wide, brand column plus link columns with 14px titles.
export function Footer() {
	return (
		<footer className="border-t border-line">
			<Container width={1024} className="py-16">
				<div className="grid gap-10 md:grid-cols-[1fr_repeat(4,160px)]">
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
								{links.map((l) => (
									<li key={l}>
										<a
											href="/"
											className="text-[14px] text-text-2 hover:text-ink"
										>
											{l}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
				<div className="mt-16 flex items-center justify-between border-t border-line pt-6 text-[13px] text-text-2">
					<span className="flex items-center gap-2">
						<span className="h-1.5 w-1.5 rounded-full bg-positive" />
						All systems operational
					</span>
					<span>© 2026 {APP_NAME}</span>
				</div>
			</Container>
		</footer>
	);
}
