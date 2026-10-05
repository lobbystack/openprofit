import { useState } from "react";
import { APP_NAME } from "#/lib/app";
import { PROVIDERS, type ProviderId, ProviderLogo } from "../provider-logo";
import { AreaChart } from "./area-chart";
import { BreakdownCard } from "./breakdown-card";
import { MetricRow } from "./metric-row";
import {
	COSTS_BY_PROVIDER,
	type MetricKey,
	money,
	PRODUCTS,
	REVENUE_BY_SOURCE,
	SERIES,
} from "./mock-data";

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
	const [metric, setMetric] = useState<MetricKey>("profit");
	const previous = SERIES[metric].map((v) => Math.round(v * 0.88));
	const tone =
		metric === "costs" ? "negative" : metric === "profit" ? "positive" : "ink";

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

				<div className="mt-4 rounded-xl border border-line bg-card">
					<MetricRow
						selected={metric}
						onSelect={interactive ? setMetric : undefined}
					/>
					<div className="border-t border-line px-3 pt-4 pb-2">
						<AreaChart
							data={SERIES[metric]}
							previous={previous}
							tone={tone}
							height={220}
						/>
					</div>
				</div>

				<div className="mt-4 grid gap-4 md:grid-cols-2">
					<BreakdownCard
						tabs={["By product", "By source"]}
						total={PRODUCTS.reduce((a, p) => a + (p.revenue - p.costs), 0)}
						rows={PRODUCTS.map((p) => ({
							label: p.name,
							value: p.revenue - p.costs,
							secondary: `${Math.round(((p.revenue - p.costs) / p.revenue) * 100)}% margin`,
						}))}
					/>
					<BreakdownCard
						tabs={["Costs", "Revenue"]}
						total={COSTS_BY_PROVIDER.reduce((a, c) => a + c.amount, 0)}
						rows={[...COSTS_BY_PROVIDER].slice(0, 5).map((c) => ({
							label: (
								<>
									<ProviderLogo id={c.id as ProviderId} size={14} />
									{PROVIDERS[c.id].name}
								</>
							),
							value: c.amount,
						}))}
					/>
				</div>
				<div className="sr-only">
					{REVENUE_BY_SOURCE.map((r) => `${r.id} ${r.amount}`).join(", ")}{" "}
					{APP_NAME}
				</div>
			</div>
		</div>
	);
}
