import { useState } from "react";
import { Card } from "#/components/ui/card";
import { money } from "#/lib/format";
import type { MetricKey, OverviewData } from "#/lib/overview";
import { PROVIDERS, type ProviderId, ProviderLogo } from "../provider-logo";
import { AreaChart } from "./area-chart";
import { BreakdownCard } from "./breakdown-card";
import { MetricRow } from "./metric-row";

// Metric tiles over one chart. The selected tile drives the chart.
export function OverviewCard({
	data,
	interactive = true,
	chartHeight = 240,
}: {
	data: OverviewData;
	interactive?: boolean;
	chartHeight?: number;
}) {
	const [metric, setMetric] = useState<MetricKey>("profit");
	const series = data.series[metric];
	const previous = data.previousSeries[metric];
	const tone =
		metric === "costs" ? "negative" : metric === "profit" ? "positive" : "ink";
	return (
		<Card>
			<MetricRow
				data={data}
				selected={metric}
				onSelect={interactive ? setMetric : undefined}
			/>
			<div className="border-t border-line px-3 pt-4 pb-2">
				<AreaChart
					data={series}
					previous={previous}
					months={data.months}
					tone={tone}
					height={chartHeight}
				/>
			</div>
		</Card>
	);
}

export const providerLabel = (id: string) => {
	// Flat costs added on the Costs page.
	if (id === "manual") return "Flat costs";
	const p = PROVIDERS[id];
	return (
		<>
			{p ? <ProviderLogo id={id as ProviderId} size={14} /> : null}
			{p?.name ?? id.charAt(0).toUpperCase() + id.slice(1)}
		</>
	);
};

export function OverviewBreakdowns({
	data,
	full = false,
}: {
	data: OverviewData;
	full?: boolean;
}) {
	const fmt = (n: number) => money(n, { currency: data.currency });
	const profit = data.byProduct.map((p) => ({
		label: p.name,
		value: p.revenue - p.costs,
		secondary: p.revenue
			? `${Math.round(((p.revenue - p.costs) / p.revenue) * 100)}%`
			: undefined,
	}));
	const costs = data.costsByProvider
		.slice(0, full ? undefined : 5)
		.map((c) => ({ label: providerLabel(c.provider), value: c.amount }));
	const revenue = data.revenueBySource.map((r) => ({
		label: providerLabel(r.provider),
		value: r.amount,
	}));
	const costsByProduct = data.byProduct.map((p) => ({
		label: p.name,
		value: p.costs,
	}));
	const sum = (rows: { value: number }[]) =>
		rows.reduce((a, r) => a + r.value, 0);
	return (
		<div className="grid gap-4 md:grid-cols-2">
			<BreakdownCard
				tabs={["Profit by product"]}
				total={sum(profit)}
				rows={profit}
				formatter={fmt}
			/>
			<BreakdownCard
				tabs={["Costs by provider"]}
				total={sum(costs)}
				rows={costs}
				formatter={fmt}
			/>
			{full && (
				<>
					<BreakdownCard
						tabs={["Revenue by source"]}
						total={sum(revenue)}
						rows={revenue}
						formatter={fmt}
					/>
					<BreakdownCard
						tabs={["Costs by product"]}
						total={sum(costsByProduct)}
						rows={costsByProduct}
						formatter={fmt}
					/>
				</>
			)}
		</div>
	);
}
