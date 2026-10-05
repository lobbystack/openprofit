import { delta, METRICS, type MetricKey, money, SERIES } from "./mock-data";

export function MetricRow({
	selected,
	onSelect,
}: {
	selected: MetricKey;
	onSelect?: (k: MetricKey) => void;
}) {
	return (
		<div className="grid grid-cols-[repeat(5,minmax(132px,1fr))] divide-x divide-line overflow-x-auto">
			{METRICS.map((m) => {
				const series = SERIES[m.key];
				const value = series[series.length - 1];
				const d = delta(series);
				// Costs going up is bad; everything else going up is good.
				const good = m.key === "costs" ? d <= 0 : d >= 0;
				const active = selected === m.key;
				return (
					<button
						key={m.key}
						type="button"
						onClick={() => onSelect?.(m.key)}
						className={`relative px-5 py-4 text-left transition-colors duration-150 ${
							active ? "bg-surface-2" : "hover:bg-surface-2/60"
						}`}
					>
						<div className="label-mono">{m.label}</div>
						<div className="num mt-3 text-[22px] leading-none">
							{m.money ? money(value) : value.toLocaleString("en-US")}
						</div>
						<div
							className={`num mt-2 text-[12px] ${good ? "text-positive" : "text-negative"}`}
						>
							{d >= 0 ? "+" : ""}
							{d.toFixed(1)}%
						</div>
						{active && (
							<span className="absolute inset-x-0 -bottom-px h-px bg-ink" />
						)}
					</button>
				);
			})}
		</div>
	);
}
