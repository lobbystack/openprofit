import { createFileRoute } from "@tanstack/react-router";
import { Calendar, ChevronDown, Plus } from "lucide-react";
import { Control, PageHeader } from "#/components/app/shell";
import { AreaChart } from "#/components/dashboard/area-chart";
import { BreakdownCard } from "#/components/dashboard/breakdown-card";
import { providerLabel } from "#/components/dashboard/overview";
import { money } from "#/lib/format";
import { getFlatCosts } from "#/server/costs.functions";
import { getOverview } from "#/server/overview.functions";

export const Route = createFileRoute("/app/costs")({
	loader: async () => {
		const [overview, flats] = await Promise.all([
			getOverview(),
			getFlatCosts(),
		]);
		return { overview, flats };
	},
	component: Costs,
});

function Costs() {
	const { overview, flats } = Route.useLoaderData();
	const fmt = (n: number, cents = false) =>
		money(n, { currency: overview.currency, cents });
	const costs = overview.series.costs;
	const total = costs[costs.length - 1] ?? 0;
	const previous = costs.map((v) => Math.round(v * 0.9));
	return (
		<>
			<PageHeader title="Costs" meta={fmt(total)}>
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
					data={costs}
					previous={previous}
					months={overview.months}
					tone="negative"
					height={200}
				/>
			</div>

			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<BreakdownCard
					tabs={["By provider"]}
					total={overview.costsByProvider.reduce((a, c) => a + c.amount, 0)}
					rows={overview.costsByProvider.map((c) => ({
						label: providerLabel(c.provider),
						value: c.amount,
					}))}
					formatter={(n) => fmt(n)}
				/>
				<BreakdownCard
					tabs={["By product"]}
					total={overview.byProduct.reduce((a, p) => a + p.costs, 0)}
					rows={overview.byProduct.map((p) => ({
						label: p.name,
						value: p.costs,
					}))}
					formatter={(n) => fmt(n)}
				/>
			</div>

			<div className="label-mono mt-8">Flat costs</div>
			<div className="mt-3 overflow-hidden rounded-xl border border-line bg-card">
				<ul className="divide-y divide-line">
					{flats.map((f) => (
						<li key={f.id} className="flex h-11 items-center px-4 text-[13px]">
							<span className="flex-1">{f.name}</span>
							<span className="w-32 text-text-2">{f.product ?? "Shared"}</span>
							<span className="num w-24 text-right">
								{money(f.amount, { currency: f.currency, cents: true })}
							</span>
							<span className="label-mono w-16 text-right">
								/ {f.interval === "year" ? "yr" : "mo"}
							</span>
						</li>
					))}
				</ul>
			</div>
		</>
	);
}
