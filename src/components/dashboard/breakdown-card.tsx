import { money } from "./mock-data";

export type BreakdownRow = {
	label: React.ReactNode;
	value: number;
	secondary?: string;
};

export function BreakdownCard({
	tabs,
	active = 0,
	rows,
	total,
	formatter = money,
}: {
	tabs: string[];
	active?: number;
	rows: BreakdownRow[];
	total?: number;
	formatter?: (n: number) => string;
}) {
	const max = Math.max(...rows.map((r) => r.value));
	return (
		<div className="rounded-xl border border-line bg-card">
			<div className="flex items-center justify-between border-b border-line px-4">
				<div className="flex gap-4">
					{tabs.map((t, i) => (
						<span
							key={t}
							className={`relative py-3 text-[12px] ${
								i === active ? "text-ink" : "text-text-3"
							}`}
						>
							{t}
							{i === active && (
								<span className="absolute inset-x-0 -bottom-px h-px bg-ink" />
							)}
						</span>
					))}
				</div>
				<span className="label-mono">{total ? formatter(total) : ""}</span>
			</div>
			<ul className="p-2">
				{rows.map((r, i) => (
					<li
						// biome-ignore lint/suspicious/noArrayIndexKey: static rows
						key={i}
						className="relative flex h-9 items-center justify-between rounded-md px-2"
					>
						<span
							className="absolute inset-y-1 left-0 rounded-md bg-surface-2"
							style={{ width: `${(r.value / max) * 100}%` }}
						/>
						<span className="relative flex items-center gap-2 text-[13px]">
							{r.label}
						</span>
						<span className="relative flex items-center gap-3">
							{r.secondary && (
								<span className="num text-[11px] text-text-3">
									{r.secondary}
								</span>
							)}
							<span className="num text-[13px]">{formatter(r.value)}</span>
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}
