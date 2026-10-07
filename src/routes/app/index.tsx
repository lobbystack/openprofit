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
import { type PeriodKey, periodSchema } from "#/lib/overview";
import { getOverview } from "#/server/overview.functions";

export const Route = createFileRoute("/app/")({
	head: () => ({ meta: [{ title: "Overview · OpenProfit" }] }),
	validateSearch: (s: Record<string, unknown>): { period?: PeriodKey } => ({
		period: periodSchema.catch("this-month").parse(s.period),
	}),
	loaderDeps: ({ search }) => ({ period: search.period ?? "this-month" }),
	loader: ({ deps }) => getOverview({ data: { period: deps.period } }),
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
			<PageHeader title="Overview" meta="All products">
				<PeriodSelect
					value={data.period.key}
					onChange={(period) => navigate({ to: "/app", search: { period } })}
				/>
			</PageHeader>
			<div className="mt-4">
				<OverviewCard data={data} />
			</div>
			<TaxRow data={data} />
			<div className="mt-4">
				<OverviewBreakdowns data={data} full />
			</div>
		</>
	);
}
