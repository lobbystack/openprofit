import { MONTHS } from "./mock-data";

// Hand-rolled SVG area chart. Current period solid, previous period dotted.
export function AreaChart({
	data,
	previous,
	height = 260,
	tone = "ink",
	compact = false,
}: {
	data: number[];
	previous?: number[];
	height?: number;
	tone?: "ink" | "positive" | "negative";
	compact?: boolean;
}) {
	const W = 1000;
	const H = height;
	const padL = compact ? 0 : 56;
	const padR = 8;
	const padT = 12;
	const padB = compact ? 0 : 28;
	const all = [...data, ...(previous ?? [])];
	const max = Math.max(...all) * 1.08;
	const min = 0;
	const x = (i: number) => padL + (i / (data.length - 1)) * (W - padL - padR);
	const y = (v: number) =>
		padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

	const line = (s: number[]) =>
		s
			.map(
				(v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`,
			)
			.join(" ");
	const area = `${line(data)} L${x(data.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L${padL},${(H - padB).toFixed(1)} Z`;

	const stroke =
		tone === "positive"
			? "var(--positive)"
			: tone === "negative"
				? "var(--negative)"
				: "var(--ink)";

	const ticks = 4;
	const tickVals = Array.from(
		{ length: ticks + 1 },
		(_, i) => (max / ticks) * i,
	);
	const fmt = (v: number) =>
		v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`;

	return (
		<svg
			viewBox={`0 0 ${W} ${H}`}
			preserveAspectRatio="none"
			className="block h-auto w-full"
			style={{ aspectRatio: `${W} / ${H}` }}
			role="img"
			aria-label="Chart"
		>
			{!compact &&
				tickVals.map((v) => (
					<g key={v}>
						<line
							x1={padL}
							x2={W - padR}
							y1={y(v)}
							y2={y(v)}
							stroke="var(--line-subtle)"
							strokeWidth="1"
							vectorEffect="non-scaling-stroke"
						/>
						<text
							x={padL - 10}
							y={y(v) + 4}
							textAnchor="end"
							fontSize="11"
							fontFamily="var(--font-mono)"
							fill="var(--text-3)"
						>
							{fmt(v)}
						</text>
					</g>
				))}
			<path d={area} fill={stroke} fillOpacity="0.06" />
			{previous && (
				<path
					d={line(previous)}
					fill="none"
					stroke="var(--text-3)"
					strokeWidth="1.25"
					strokeDasharray="2 5"
					strokeLinecap="round"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			<path
				d={line(data)}
				fill="none"
				stroke={stroke}
				strokeWidth="1.75"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
			/>
			<circle
				cx={x(data.length - 1)}
				cy={y(data[data.length - 1])}
				r="3.5"
				fill={stroke}
				stroke="var(--card)"
				strokeWidth="2"
				vectorEffect="non-scaling-stroke"
			/>
			{!compact &&
				MONTHS.map((m, i) =>
					i % 2 === 1 ? (
						<text
							key={m}
							x={x(i)}
							y={H - 8}
							textAnchor="middle"
							fontSize="11"
							fontFamily="var(--font-mono)"
							fill="var(--text-3)"
						>
							{m}
						</text>
					) : null,
				)}
		</svg>
	);
}
