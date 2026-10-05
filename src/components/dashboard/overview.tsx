import { useState } from "react";
import { PROVIDERS, type ProviderId, ProviderLogo } from "../provider-logo";
import { AreaChart } from "./area-chart";
import { BreakdownCard } from "./breakdown-card";
import { MetricRow } from "./metric-row";
import {
	COSTS_BY_PROVIDER,
	type MetricKey,
	PRODUCTS,
	REVENUE_BY_SOURCE,
	SERIES,
} from "./mock-data";

// Metric tiles over one chart. The selected tile drives the chart.
export function OverviewCard({
	interactive = true,
	chartHeight = 240,
}: {
	interactive?: boolean;
	chartHeight?: number;
}) {
	const [metric, setMetric] = useState<MetricKey>("profit");
	const previous = SERIES[metric].map((v) => Math.round(v * 0.88));
	const tone =
		metric === "costs" ? "negative" : metric === "profit" ? "positive" : "ink";
	return (
		<div className="rounded-xl border border-line bg-card">
			<MetricRow
				selected={metric}
				onSelect={interactive ? setMetric : undefined}
			/>
			<div className="border-t border-line px-3 pt-4 pb-2">
				<AreaChart
					data={SERIES[metric]}
					previous={previous}
					tone={tone}
					height={chartHeight}
				/>
			</div>
		</div>
	);
}

const providerLabel = (id: string) => (
	<>
		<ProviderLogo id={id as ProviderId} size={14} />
		{PROVIDERS[id].name}
	</>
);

export function OverviewBreakdowns({ full = false }: { full?: boolean }) {
	const profit = PRODUCTS.map((p) => ({
		label: p.name,
		value: p.revenue - p.costs,
		secondary: `${Math.round(((p.revenue - p.costs) / p.revenue) * 100)}%`,
	}));
	const costs = [...COSTS_BY_PROVIDER]
		.slice(0, full ? undefined : 5)
		.map((c) => ({ label: providerLabel(c.id), value: c.amount }));
	const revenue = REVENUE_BY_SOURCE.map((r) => ({
		label: providerLabel(r.id),
		value: r.amount,
	}));
	const costsByProduct = PRODUCTS.map((p) => ({
		label: p.name,
		value: p.costs,
	}));
	return (
		<div className="grid gap-4 md:grid-cols-2">
			<BreakdownCard
				tabs={["Profit by product", "Margin"]}
				total={profit.reduce((a, r) => a + r.value, 0)}
				rows={profit}
			/>
			<BreakdownCard
				tabs={["Costs by provider"]}
				total={costs.reduce((a, r) => a + r.value, 0)}
				rows={costs}
			/>
			{full && (
				<>
					<BreakdownCard
						tabs={["Revenue by source"]}
						total={revenue.reduce((a, r) => a + r.value, 0)}
						rows={revenue}
					/>
					<BreakdownCard
						tabs={["Costs by product"]}
						total={costsByProduct.reduce((a, r) => a + r.value, 0)}
						rows={costsByProduct}
					/>
				</>
			)}
		</div>
	);
}
