import { AreaChart } from "#/components/dashboard/area-chart";
import { BreakdownCard } from "#/components/dashboard/breakdown-card";
import { providerLabel } from "#/components/dashboard/overview";
import { Card } from "#/components/ui/card";
import { money, monthLabel } from "#/lib/format";
import type { OverviewData } from "#/lib/overview";
import type { FlatCostRow } from "#/server/costs.functions";

// The Costs page's chart and its two breakdowns, in /app and /demo.
export function CostsCharts({ overview }: { overview: OverviewData }) {
	const fmt = (n: number) => money(n, { currency: overview.currency });
	return (
		<>
			<Card className="mt-4 px-3 pt-4 pb-2">
				<AreaChart
					data={overview.series.costs}
					previous={overview.previousSeries.costs}
					months={overview.months}
					tone="negative"
					height={200}
					currency={overview.currency}
				/>
			</Card>

			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<BreakdownCard
					tabs={["By provider"]}
					total={overview.costsByProvider.reduce((a, c) => a + c.amount, 0)}
					rows={overview.costsByProvider.map((c) => ({
						label: providerLabel(c.provider),
						value: c.amount,
					}))}
					formatter={fmt}
				/>
				<BreakdownCard
					tabs={["By product"]}
					total={overview.byProduct.reduce((a, p) => a + p.costs, 0)}
					rows={overview.byProduct.map((p) => ({
						label: p.name,
						value: p.costs,
					}))}
					formatter={fmt}
				/>
			</div>
		</>
	);
}

const monthYear = (day: string) =>
	`${monthLabel(day.slice(0, 7))} ${day.slice(0, 4)}`;

const span = (f: FlatCostRow) =>
	f.endsOn
		? `${monthYear(f.startsOn)} to ${monthYear(f.endsOn)}`
		: `Since ${monthYear(f.startsOn)}`;

// One flat cost in the list. Children are the app's edit and remove buttons.
export function FlatCostItem({
	cost: f,
	children,
}: {
	cost: FlatCostRow;
	children?: React.ReactNode;
}) {
	return (
		<li className="flex min-h-11 items-center gap-3 px-4 py-2 text-[13px]">
			<span className="min-w-0 flex-1">
				<span className="block truncate">{f.name}</span>
				<span className="block text-[12px] text-text-3">{span(f)}</span>
			</span>
			<span className="hidden w-32 truncate text-text-2 sm:block">
				{f.product ?? "Shared"}
			</span>
			<span className="num w-24 text-right">
				{money(f.amount, { currency: f.currency, cents: true })}
			</span>
			<span className="label-mono w-10 text-right">
				/ {f.interval === "year" ? "yr" : "mo"}
			</span>
			{children && (
				<span className="flex shrink-0 items-center gap-1">{children}</span>
			)}
		</li>
	);
}
