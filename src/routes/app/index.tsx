import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "#/components/app/shell";
import {
	OverviewBreakdowns,
	OverviewCard,
	TaxRow,
} from "#/components/dashboard/overview";
import { PeriodSelect } from "#/components/dashboard/period-select";
import { buttonVariants } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { bandLabel, formatValue, METRICS, monthName } from "#/lib/benchmarks";
import { type PeriodKey, periodSchema } from "#/lib/overview";
import { getMyBenchmarks } from "#/server/benchmarks.functions";
import { getOverview } from "#/server/overview.functions";

export const Route = createFileRoute("/app/")({
	head: () => ({ meta: [{ title: "Overview · OpenProfit" }] }),
	validateSearch: (s: Record<string, unknown>): { period?: PeriodKey } => ({
		period: periodSchema.catch("this-month").parse(s.period),
	}),
	loaderDeps: ({ search }) => ({ period: search.period ?? "this-month" }),
	loader: async ({ deps }) => {
		const [data, bench] = await Promise.all([
			getOverview({ data: { period: deps.period } }),
			getMyBenchmarks(),
		]);
		return { ...data, bench };
	},
	component: Overview,
});

function Overview() {
	const data = Route.useLoaderData();
	const navigate = useNavigate();
	const empty =
		data.revenueBySource.length === 0 && data.costsByProvider.length === 0;
	if (empty) {
		return (
			<>
				<PageHeader title="Overview" />
				<Card className="mt-4 flex flex-col items-start gap-4 p-6">
					<p className="text-[14px]">
						Connect Stripe, Paddle or another revenue source. Profit shows here
						after the first sync.
					</p>
					<Link to="/app/connections" className={buttonVariants({})}>
						Add a connection
					</Link>
				</Card>
			</>
		);
	}
	return (
		<>
			<PageHeader title="Overview" meta={data.product?.name ?? "All products"}>
				<PeriodSelect
					value={data.period.key}
					onChange={(period) => navigate({ to: "/app", search: { period } })}
				/>
			</PageHeader>
			<div className="mt-4">
				<OverviewCard data={data} />
			</div>
			<TaxRow data={data} />
			<BenchmarkRow bench={data.bench} />
			<div className="mt-4">
				<OverviewBreakdowns data={data} full />
			</div>
		</>
	);
}

// Hosted: last month's figures next to the medians of workspaces in the
// same MRR band. Hidden when the workspace opted out or the band has no data.
function BenchmarkRow({
	bench,
}: {
	bench: Awaited<ReturnType<typeof getMyBenchmarks>>;
}) {
	if (!bench) return null;
	return (
		<Card className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 px-5 py-3 text-[13px]">
			<span className="text-text-3">
				{monthName(bench.month)}, against {bandLabel(bench.band)} MRR
			</span>
			{bench.items.map((i) => {
				const m = METRICS.find((x) => x.key === i.metric);
				return (
					<span key={i.metric} title={m?.hint}>
						{m?.label}{" "}
						<span className="num">{formatValue(i.metric, i.own)}</span>{" "}
						<span className="num text-text-3">
							median {formatValue(i.metric, i.median)}
						</span>
					</span>
				);
			})}
			<Link to="/data" className="ml-auto text-text-3 hover:text-ink">
				All benchmarks
			</Link>
		</Card>
	);
}
