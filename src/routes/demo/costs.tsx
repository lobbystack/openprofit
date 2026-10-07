import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CostsCharts, FlatCostItem } from "#/components/app/costs";
import { PageHeader } from "#/components/app/shell";
import { PeriodSelect } from "#/components/dashboard/period-select";
import { Card } from "#/components/ui/card";
import { money } from "#/lib/format";
import { type PeriodKey, periodSchema } from "#/lib/overview";
import { getFlatCosts } from "#/server/costs.functions";
import { getOverview } from "#/server/overview.functions";

export const Route = createFileRoute("/demo/costs")({
	head: () => ({ meta: [{ title: "Costs · OpenProfit demo" }] }),
	validateSearch: (s: Record<string, unknown>): { period?: PeriodKey } => ({
		period: s.period
			? periodSchema.catch("this-month").parse(s.period)
			: undefined,
	}),
	loaderDeps: ({ search }) => ({ period: search.period ?? "this-month" }),
	loader: async ({ deps }) => {
		const [overview, flat] = await Promise.all([
			getOverview({ data: { period: deps.period, demo: true } }),
			getFlatCosts({ data: { demo: true } }),
		]);
		return { overview, flats: flat.flats };
	},
	component: DemoCosts,
});

function DemoCosts() {
	const { overview, flats } = Route.useLoaderData();
	const navigate = useNavigate();
	return (
		<>
			<PageHeader
				title="Costs"
				meta={money(overview.period.totals.costs, {
					currency: overview.currency,
				})}
			>
				<PeriodSelect
					value={overview.period.key}
					onChange={(period) =>
						navigate({ to: "/demo/costs", search: { period } })
					}
				/>
			</PageHeader>
			<CostsCharts overview={overview} />
			<div className="label-mono mt-8">Flat costs</div>
			<Card className="mt-3 overflow-hidden">
				<ul className="divide-y divide-line">
					{flats.map((f) => (
						<FlatCostItem key={f.id} cost={f} />
					))}
				</ul>
			</Card>
		</>
	);
}
