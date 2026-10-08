import { lazy, Suspense } from "react";

export type AreaChartProps = {
	data: number[];
	previous?: number[];
	// The last point at its pace so far while its month is in progress; the
	// line runs dashed to it.
	pace?: number | null;
	// YYYY-MM per point, for the x axis.
	months?: string[];
	height?: number;
	tone?: "ink" | "positive" | "negative";
	compact?: boolean;
	// Currency for tooltip amounts; USD when not set.
	currency?: string;
};

export const TONES = {
	ink: "var(--ink)",
	positive: "var(--positive)",
	negative: "var(--negative)",
} as const;

// The full chart keeps the 1000:height proportions it was designed at; a
// sparkline keeps its pixel height, or it would render 2px tall in a cell.
export const chartSize = (height: number, compact: boolean) =>
	compact ? { height } : { aspectRatio: `1000 / ${height}` };

// Axis on 1-2-5 steps that always includes zero, so losses go below it.
export function axis(values: number[], count = 4) {
	const lo = Math.min(0, ...values);
	const hi = Math.max(0, ...values);
	const raw = (hi - lo || count) / count;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
	const min = Math.floor(lo / step) * step;
	const max = Math.max(Math.ceil(hi / step) * step, min + step);
	const ticks = Array.from(
		{ length: Math.round((max - min) / step) + 1 },
		(_, i) => min + step * i,
	);
	return { min, max, ticks };
}

// Recharts loads in its own chunk, so the rest of a page (the landing hero
// in particular) is interactive without waiting for it. The placeholder has
// the chart's size, so nothing moves when it arrives.
const Chart = lazy(() => import("./area-chart-recharts"));

export function AreaChart(props: AreaChartProps) {
	const style = chartSize(props.height ?? 260, !!props.compact);
	return (
		<Suspense fallback={<div className="w-full" style={style} />}>
			<Chart {...props} />
		</Suspense>
	);
}
