import {
	Area,
	CartesianGrid,
	ComposedChart,
	Line,
	XAxis,
	YAxis,
} from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "#/components/ui/chart";
import { money, monthLabel } from "#/lib/format";
import { type AreaChartProps, axis, chartSize, TONES } from "./area-chart";

// Current period solid with a light fill to zero, previous period dotted.
// A month in progress runs dashed to its pace. Loaded on its own (see
// area-chart.tsx) so Recharts never delays a page.
export default function AreaChartRecharts({
	data,
	previous,
	pace,
	months = [],
	height = 260,
	tone = "ink",
	compact = false,
	currency,
}: AreaChartProps) {
	const color = TONES[tone];
	const last = data.length - 1;
	const dashed = pace != null && last > 0;
	const { min, max, ticks } = axis([
		...data,
		...(previous ?? []),
		...(dashed ? [pace] : []),
	]);
	const rows = data.map((value, i) => ({
		month: months[i] ?? String(i),
		value: dashed && i === last ? undefined : value,
		// The dashed segment from the last full month to the pace.
		pace: dashed && i >= last - 1 ? (i === last ? pace : value) : undefined,
		// What the month in progress holds so far, for the tooltip.
		sofar: dashed && i === last ? value : undefined,
		previous: previous?.[i],
	}));
	const config = {
		value: { label: "This period", color },
		pace: { label: "On pace for", color },
		previous: { label: "A year earlier", color: "var(--text-3)" },
	} satisfies ChartConfig;
	const short = (v: number) =>
		Math.abs(v) >= 1000
			? `${Math.round(v / 100) / 10}k`
			: `${Number(v.toFixed(2))}`;

	return (
		<ChartContainer
			config={config}
			className="aspect-auto w-full"
			style={chartSize(height, compact)}
		>
			<ComposedChart
				accessibilityLayer
				data={rows}
				margin={
					compact
						? { top: 4, right: 4, bottom: 4, left: 4 }
						: { top: 12, right: 8, bottom: 0, left: 0 }
				}
			>
				{!compact && (
					<CartesianGrid vertical={false} stroke="var(--line-subtle)" />
				)}
				<YAxis
					hide={compact}
					domain={[min, max]}
					ticks={ticks}
					tickFormatter={short}
					tickLine={false}
					axisLine={false}
					tickMargin={10}
					width={56}
				/>
				<XAxis
					hide={compact}
					dataKey="month"
					// Points edge to edge, not centered in bands.
					scale="point"
					ticks={months.filter((_, i) => i % 2 === 1)}
					tickFormatter={monthLabel}
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					height={28}
				/>
				{!compact && (
					<ChartTooltip
						cursor={{ strokeDasharray: "2 4" }}
						content={({ active, payload, label }) => (
							<ChartTooltipContent
								active={active}
								label={label}
								// The pace only shows on the month in progress.
								payload={payload?.filter(
									(p) => p.dataKey !== "pace" || p.payload?.sofar != null,
								)}
								indicator="line"
								labelFormatter={(_, p) => {
									const row = p?.[0]?.payload as
										| { month?: string; sofar?: number }
										| undefined;
									const m = row?.month;
									if (!m) return "";
									const name = `${monthLabel(m)} ${m.slice(0, 4)}`;
									return row.sofar == null
										? name
										: `${name}, ${money(row.sofar, { currency })} so far`;
								}}
								valueFormatter={(v) => money(v, { currency })}
							/>
						)}
					/>
				)}
				<Area
					dataKey="value"
					type="linear"
					baseValue={0}
					stroke="var(--color-value)"
					strokeWidth={1.75}
					strokeLinejoin="round"
					fill="var(--color-value)"
					fillOpacity={0.06}
					animationDuration={280}
					animationEasing="ease-in-out"
					activeDot={{ r: 3.5, strokeWidth: 2, stroke: "var(--card)" }}
					dot={(p: { index: number; cx?: number; cy?: number }) =>
						!dashed && p.index === last && p.cx !== undefined ? (
							<circle
								key="last"
								cx={p.cx}
								cy={p.cy}
								r={3.5}
								fill={color}
								stroke="var(--card)"
								strokeWidth={2}
							/>
						) : (
							<g key={p.index} />
						)
					}
				/>
				{dashed && (
					<Line
						dataKey="pace"
						type="linear"
						stroke="var(--color-pace)"
						strokeWidth={1.75}
						strokeDasharray="4 4"
						dot={(p: { index: number; cx?: number; cy?: number }) =>
							p.index === last && p.cx !== undefined ? (
								<circle
									key="last"
									cx={p.cx}
									cy={p.cy}
									r={3.5}
									fill="var(--card)"
									stroke={color}
									strokeWidth={1.75}
								/>
							) : (
								<g key={p.index} />
							)
						}
						activeDot={{ r: 3.5, strokeWidth: 2, stroke: "var(--card)" }}
						animationDuration={280}
						animationEasing="ease-in-out"
					/>
				)}
				{previous && (
					<Line
						dataKey="previous"
						type="linear"
						stroke="var(--color-previous)"
						strokeWidth={1.25}
						strokeDasharray="2 5"
						strokeLinecap="round"
						dot={false}
						activeDot={false}
						animationDuration={280}
						animationEasing="ease-in-out"
					/>
				)}
			</ComposedChart>
		</ChartContainer>
	);
}
