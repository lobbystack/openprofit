import { money, PRODUCTS } from "./mock-data";
import { OverviewBreakdowns, OverviewCard } from "./overview";

const NAV = [
	["Overview", true],
	["Products", false],
	["Connections", false],
	["Costs", false],
	["Alerts", false],
] as const;

// The dashboard as it appears in the landing hero. Static data, real components.
export function DashboardPreview({
	interactive = true,
}: {
	interactive?: boolean;
}) {
	return (
		<div className="flex overflow-hidden rounded-xl border border-line bg-paper text-left">
			<aside className="hidden w-[200px] shrink-0 border-r border-line p-3 md:block">
				<div className="flex h-8 items-center justify-between px-2">
					<span className="text-[13px]">Acme Labs</span>
					<span className="label-mono">⌘K</span>
				</div>
				<div className="label-mono mt-5 px-2">Workspace</div>
				<ul className="mt-2 space-y-px">
					{NAV.map(([label, active]) => (
						<li
							key={label}
							className={`flex h-7 items-center rounded-md px-2 text-[13px] ${
								active ? "bg-surface-2 text-ink" : "text-text-2"
							}`}
						>
							{label}
						</li>
					))}
				</ul>
				<div className="label-mono mt-6 px-2">Products</div>
				<ul className="mt-2 space-y-px">
					{PRODUCTS.map((p) => (
						<li
							key={p.name}
							className="flex h-7 items-center justify-between rounded-md px-2 text-[13px] text-text-2"
						>
							<span>{p.name}</span>
							<span className="num text-[11px] text-text-3">
								{money(p.revenue - p.costs)}
							</span>
						</li>
					))}
				</ul>
			</aside>

			<div className="min-w-0 flex-1 p-5">
				<div className="flex items-center justify-between">
					<div className="flex items-baseline gap-3">
						<h2 className="text-[18px]">Overview</h2>
						<span className="text-[12px] text-text-3">All products</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="flex h-7 items-center rounded-md border border-line px-2.5 text-[12px]">
							This month
						</span>
						<span className="hidden h-7 items-center gap-1.5 rounded-md border border-line px-2.5 text-[12px] text-text-2 md:flex">
							<span className="h-1.5 w-1.5 rounded-full bg-positive" />
							Synced 4 min ago
						</span>
					</div>
				</div>
				<div className="mt-4">
					<OverviewCard interactive={interactive} chartHeight={220} />
				</div>
				<div className="mt-4">
					<OverviewBreakdowns />
				</div>
			</div>
		</div>
	);
}
