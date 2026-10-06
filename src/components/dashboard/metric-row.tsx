import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { money } from "#/lib/format";
import { METRICS, type MetricKey, type OverviewData } from "#/lib/overview";

export function MetricRow({
	data,
	selected,
	onSelect,
}: {
	data: OverviewData;
	selected: MetricKey;
	onSelect?: (k: MetricKey) => void;
}) {
	return (
		<ToggleGroup
			variant="tile"
			size="tile"
			spacing={0}
			aria-label="Metric"
			value={[selected]}
			// Picking the selected tile again keeps it selected.
			onValueChange={(v) => v[0] && onSelect?.(v[0] as MetricKey)}
			className="grid w-auto grid-cols-[repeat(5,minmax(132px,1fr))] divide-x divide-line overflow-x-auto"
		>
			{METRICS.map((m) => {
				const value = data.period.totals[m.key];
				const prev = data.period.previous[m.key];
				const d = prev ? ((value - prev) / prev) * 100 : 0;
				// Costs going up is bad; everything else going up is good.
				const good = m.key === "costs" ? d <= 0 : d >= 0;
				const active = selected === m.key;
				return (
					<ToggleGroupItem key={m.key} value={m.key} title={m.hint}>
						<div className="label-mono">{m.label}</div>
						<div className="num mt-3 text-[22px] leading-none">
							{m.money
								? money(value, { currency: data.currency })
								: value.toLocaleString("en-US")}
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
					</ToggleGroupItem>
				);
			})}
		</ToggleGroup>
	);
}
