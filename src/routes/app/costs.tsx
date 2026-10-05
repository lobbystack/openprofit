import { createFileRoute } from "@tanstack/react-router";
import { Calendar, ChevronDown, Plus } from "lucide-react";
import { Control, PageHeader } from "#/components/app/shell";
import { AreaChart } from "#/components/dashboard/area-chart";
import { BreakdownCard } from "#/components/dashboard/breakdown-card";
import {
	COSTS_BY_PROVIDER,
	money,
	PRODUCTS,
	SERIES,
} from "#/components/dashboard/mock-data";
import {
	PROVIDERS,
	type ProviderId,
	ProviderLogo,
} from "#/components/provider-logo";

export const Route = createFileRoute("/app/costs")({ component: Costs });

const FLAT = [
	["Supabase Pro", "Draftly", 25],
	["Firecrawl", "Draftly", 19],
	["draftly.app", "Draftly", 1.17],
	["shipmail.dev", "Shipmail", 1.17],
] as const;

function Costs() {
	const total = SERIES.costs[SERIES.costs.length - 1];
	const previous = SERIES.costs.map((v) => Math.round(v * 0.9));
	return (
		<>
			<PageHeader title="Costs" meta={money(total)}>
				<Control>
					<Calendar size={13} />
					This month
					<ChevronDown size={13} className="text-text-3" />
				</Control>
				<Control>
					<Plus size={13} />
					Add flat cost
				</Control>
			</PageHeader>

			<div className="mt-4 rounded-xl border border-line bg-card px-3 pt-4 pb-2">
				<AreaChart
					data={SERIES.costs}
					previous={previous}
					tone="negative"
					height={200}
				/>
			</div>

			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<BreakdownCard
					tabs={["By provider"]}
					total={COSTS_BY_PROVIDER.reduce((a, c) => a + c.amount, 0)}
					rows={COSTS_BY_PROVIDER.map((c) => ({
						label: (
							<>
								<ProviderLogo id={c.id as ProviderId} size={14} />
								{PROVIDERS[c.id].name}
							</>
						),
						value: c.amount,
					}))}
				/>
				<BreakdownCard
					tabs={["By product"]}
					total={PRODUCTS.reduce((a, p) => a + p.costs, 0)}
					rows={PRODUCTS.map((p) => ({ label: p.name, value: p.costs }))}
				/>
			</div>

			<div className="label-mono mt-8">Flat costs</div>
			<div className="mt-3 overflow-hidden rounded-xl border border-line bg-card">
				<ul className="divide-y divide-line">
					{FLAT.map(([name, product, amount]) => (
						<li key={name} className="flex h-11 items-center px-4 text-[13px]">
							<span className="flex-1">{name}</span>
							<span className="w-32 text-text-2">{product}</span>
							<span className="num w-24 text-right">
								{money(amount, { cents: true })}
							</span>
							<span className="label-mono w-16 text-right">/ mo</span>
						</li>
					))}
				</ul>
			</div>
		</>
	);
}
