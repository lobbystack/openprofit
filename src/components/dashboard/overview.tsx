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
	const [picked, setMetric] = useState<MetricKey>("profit");
	// A product without MRR and subscriptions falls back to profit.
	const metric =
		!data.snapshots && (picked === "mrr" || picked === "customers")
			? "profit"
			: picked;
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
					pace={data.pace?.[metric]}
					months={data.months}
					tone={tone}
					height={chartHeight}
					currency={data.currency}
				/>
			</div>
		</Card>
	);
}

// Tax customers paid in the period. Shown only when there is any.
export function TaxRow({ data }: { data: OverviewData }) {
	const tax = data.period.tax;
	if (!tax || (!tax.total && !tax.previous)) return null;
	const fmt = (n: number) => money(n, { currency: data.currency });
	const d = ((tax.total - tax.previous) / tax.previous) * 100;
	return (
		<Card className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 text-[13px]">
			<span className="text-text-3">Tax collected</span>
			<span className="num">{fmt(tax.total)}</span>
			{tax.previous !== 0 && (
				<span className="num text-[12px] text-text-3">
					{d >= 0 ? "+" : ""}
					{d.toFixed(1)}%
				</span>
			)}
			<span className="ml-auto text-text-3">
				{tax.owed <= 0
					? "Your providers file it"
					: tax.owed >= tax.total
						? "Yours to file"
						: `${fmt(tax.owed)} is yours to file`}
			</span>
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
