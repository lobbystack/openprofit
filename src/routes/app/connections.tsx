import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Control, PageHeader } from "#/components/app/shell";
import {
	COSTS_BY_PROVIDER,
	money,
	REVENUE_BY_SOURCE,
} from "#/components/dashboard/mock-data";
import {
	PROVIDERS,
	type ProviderId,
	ProviderLogo,
} from "#/components/provider-logo";

export const Route = createFileRoute("/app/connections")({
	component: Connections,
});

type Row = { id: ProviderId; amount: number; kind: "revenue" | "cost" };

const ROWS: Row[] = [
	...REVENUE_BY_SOURCE.map((r) => ({ ...r, kind: "revenue" as const })),
	...COSTS_BY_PROVIDER.map((c) => ({ ...c, kind: "cost" as const })),
];

const AVAILABLE = (Object.keys(PROVIDERS) as ProviderId[]).filter(
	(id) => !ROWS.some((r) => r.id === id),
);

function Connections() {
	return (
		<>
			<PageHeader title="Connections" meta={`${ROWS.length}`}>
				<Control>
					<Plus size={13} />
					Connect
				</Control>
			</PageHeader>

			<div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
				<ul className="divide-y divide-line">
					{ROWS.map((r) => {
						const p = PROVIDERS[r.id];
						return (
							<li
								key={`${r.kind}-${r.id}`}
								className="flex h-12 items-center gap-3 px-4 text-[13px]"
							>
								<span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-paper">
									<ProviderLogo id={r.id} size={14} />
								</span>
								<span className="w-32">{p.name}</span>
								<span className="label-mono hidden w-20 sm:block">
									{r.kind}
								</span>
								<span className="hidden items-center gap-1.5 text-[12px] text-text-2 sm:flex">
									<span className="h-1.5 w-1.5 rounded-full bg-positive" />
									Synced
								</span>
								<span className="num ml-auto hidden text-[12px] text-text-3 sm:inline">
									hourly
								</span>
								<span
									className={`num ml-auto w-24 text-right sm:ml-0 ${
										r.kind === "cost" ? "text-negative" : ""
									}`}
								>
									{r.kind === "cost" ? "−" : ""}
									{money(r.amount)}
								</span>
							</li>
						);
					})}
				</ul>
			</div>

			<div className="label-mono mt-8">Available</div>
			<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
				{AVAILABLE.map((id) => {
					const p = PROVIDERS[id];
					return (
						<button
							key={id}
							type="button"
							className="flex h-14 items-center gap-3 rounded-xl border border-line bg-card px-4 text-left text-[13px] transition-colors duration-150 hover:border-line-strong"
						>
							<ProviderLogo id={id} size={18} className="text-ink" />
							<span className="flex-1">{p.name}</span>
							{!p.v1 && <span className="label-mono">soon</span>}
						</button>
					);
				})}
			</div>
		</>
	);
}
