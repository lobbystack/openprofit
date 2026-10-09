import {
	Bell,
	BookOpen,
	Cable,
	ChevronsUpDown,
	LayoutGrid,
	Package,
	Receipt,
	Search,
	Settings,
} from "lucide-react";
import { MOCK_OVERVIEW } from "./mock-data";
import { OverviewBreakdowns, OverviewCard } from "./overview";

// The app's sidebar, as in src/components/app/shell.tsx.
const NAV = [
	["Overview", LayoutGrid, true],
	["Products", Package, false],
	["Connections", Cable, false],
	["Costs", Receipt, false],
	["Books", BookOpen, false],
	["Alerts", Bell, false],
	["Settings", Settings, false],
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
				<div className="flex h-8 items-center justify-between px-2 text-[13px]">
					<span className="flex items-center gap-2">
						<span className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-ink text-[10px] text-paper">
							A
						</span>
						All
					</span>
					<ChevronsUpDown size={13} className="text-text-3" />
				</div>
				<div className="mt-2 flex h-7 items-center gap-2 rounded-md border border-line px-2 text-[12px] text-text-3">
					<Search size={12} />
					<span className="flex-1">Search</span>
					<span className="label-mono">⌘K</span>
				</div>
				<ul className="mt-4 space-y-px">
					{NAV.map(([label, Icon, active]) => (
						<li
							key={label}
							className={`flex h-7 items-center gap-2.5 rounded-md px-2 text-[13px] ${
								active ? "bg-surface-2 text-ink" : "text-text-2"
							}`}
						>
							<Icon size={14} />
							{label}
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
					<OverviewCard
						data={MOCK_OVERVIEW}
						interactive={interactive}
						chartHeight={220}
					/>
				</div>
				<div className="mt-4">
					<OverviewBreakdowns data={MOCK_OVERVIEW} />
				</div>
			</div>
		</div>
	);
}
