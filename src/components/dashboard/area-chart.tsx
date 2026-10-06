import { useEffect, useRef, useState } from "react";
import { monthLabel } from "#/lib/format";

// Values glide from what's on screen to the new target. A new target
// mid-animation starts from the current frame, so it never jumps.
function useGlide(target: number[], ms = 280) {
	const [shown, setShown] = useState(target);
	const current = useRef(target);
	const key = target.join(",");
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on values
	useEffect(() => {
		const from = current.current;
		const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (calm || from.length !== target.length) {
			current.current = target;
			setShown(target);
			return;
		}
		const start = performance.now();
		let frame = 0;
		const tick = (now: number) => {
			const k = Math.min(1, (now - start) / ms);
			// Ease-in-out: the line is moving on screen, not entering.
			const e = k < 0.5 ? 8 * k ** 4 : 1 - (-2 * k + 2) ** 4 / 2;
			const next = target.map((v, i) => from[i] + (v - from[i]) * e);
			current.current = next;
			setShown(next);
			if (k < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [key]);
	return shown;
}

// Hand-rolled SVG area chart. Current period solid, previous period dotted.
export function AreaChart({
	data: dataIn,
	previous: previousIn,
	months = [],
	height = 260,
	tone = "ink",
	compact = false,
}: {
	data: number[];
	previous?: number[];
	// YYYY-MM per point, for the x axis.
	months?: string[];
	height?: number;
	tone?: "ink" | "positive" | "negative";
	compact?: boolean;
}) {
	const data = useGlide(dataIn);
	const glidedPrevious = useGlide(previousIn ?? []);
	const previous = previousIn ? glidedPrevious : undefined;
	const W = 1000;
	const H = height;
	const padL = compact ? 0 : 56;
	const padR = 8;
	const padT = 12;
	const padB = compact ? 0 : 28;
	const all = [...data, ...(previous ?? [])];
	// Axis on 1-2-5 steps that always includes zero, so losses go below it.
	const ticks = 4;
	const lo = Math.min(0, ...all);
	const hi = Math.max(0, ...all);
	const raw = (hi - lo || ticks) / ticks;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
	const min = Math.floor(lo / step) * step;
	const max = Math.max(Math.ceil(hi / step) * step, min + step);
	const x = (i: number) => padL + (i / (data.length - 1)) * (W - padL - padR);
	const y = (v: number) =>
		padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

	const line = (s: number[]) =>
		s
			.map(
				(v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`,
			)
			.join(" ");
	// The area fills to the zero line, above it for gains and below for losses.
	const zero = y(0).toFixed(1);
	const area = `${line(data)} L${x(data.length - 1).toFixed(1)},${zero} L${padL},${zero} Z`;

	const stroke =
		tone === "positive"
			? "var(--positive)"
			: tone === "negative"
				? "var(--negative)"
				: "var(--ink)";

	const tickVals = Array.from(
		{ length: Math.round((max - min) / step) + 1 },
		(_, i) => min + step * i,
	);
	const fmt = (v: number) =>
		Math.abs(v) >= 1000
			? `${Math.round(v / 100) / 10}k`
			: `${Number(v.toFixed(2))}`;

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
				months.map((m, i) =>
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
							{monthLabel(m)}
						</text>
					) : null,
				)}
		</svg>
	);
}
