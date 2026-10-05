import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Control, PageHeader } from "#/components/app/shell";
import {
	PROVIDERS,
	type ProviderId,
	ProviderLogo,
} from "#/components/provider-logo";
import { money } from "#/lib/format";
import { getConnections } from "#/server/connections.functions";

export const Route = createFileRoute("/app/connections")({
	loader: () => getConnections(),
	component: Connections,
});

const cadence = (minutes: number) =>
	minutes >= 1440
		? "daily"
		: minutes >= 60
			? `every ${minutes / 60}h`.replace("every 1h", "hourly")
			: `every ${minutes}m`;

const ago = (ts: number | null) => {
	if (!ts) return "never";
	const m = Math.round((Date.now() - ts) / 60_000);
	return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};

function Connections() {
	const rows = Route.useLoaderData();
	const connected = new Set(rows.map((r) => r.provider));
	const available = (Object.keys(PROVIDERS) as ProviderId[]).filter(
		(id) => !connected.has(id),
	);
	return (
		<>
			<PageHeader title="Connections" meta={`${rows.length}`}>
				<Control>
					<Plus size={13} />
					Connect
				</Control>
			</PageHeader>

			<div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
				<ul className="divide-y divide-line">
					{rows.map((r) => {
						const p = PROVIDERS[r.provider];
						return (
							<li
								key={r.id}
								className="flex h-12 items-center gap-3 px-4 text-[13px]"
							>
								<span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-paper">
									{p && <ProviderLogo id={r.provider} size={14} />}
								</span>
								<span className="w-32">{p?.name ?? r.provider}</span>
								<span className="label-mono hidden w-20 sm:block">
									{r.kind}
								</span>
								<span className="hidden items-center gap-1.5 text-[12px] text-text-2 sm:flex">
									<span
										className={`h-1.5 w-1.5 rounded-full ${
											r.status === "active"
												? "bg-positive"
												: r.status === "error"
													? "bg-negative"
													: "bg-surface-4"
										}`}
									/>
									{r.status === "active" ? ago(r.lastSyncedAt) : r.status}
								</span>
								<span className="num ml-auto hidden text-[12px] text-text-3 sm:inline">
									{cadence(r.cadenceMinutes)}
								</span>
								<span
									className={`num ml-auto w-24 text-right sm:ml-0 ${
										r.amount < 0 ? "text-negative" : ""
									}`}
								>
									{r.amount < 0 ? "−" : ""}
									{money(Math.abs(r.amount))}
								</span>
							</li>
						);
					})}
				</ul>
			</div>

			<div className="label-mono mt-8">Available</div>
			<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
				{available.map((id) => {
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
