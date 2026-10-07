import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "#/components/app/shell";
import {
	OverviewBreakdowns,
	OverviewCard,
	TaxRow,
} from "#/components/dashboard/overview";
import { PeriodSelect } from "#/components/dashboard/period-select";
import { type PeriodKey, periodSchema } from "#/lib/overview";
import { getOverview } from "#/server/overview.functions";

export const Route = createFileRoute("/demo/")({
	// No period in the URL stays that way, so /demo doesn't redirect.
	validateSearch: (s: Record<string, unknown>): { period?: PeriodKey } => ({
		period: s.period ? periodSchema.catch("30d").parse(s.period) : undefined,
	}),
	loaderDeps: ({ search }) => ({ period: search.period ?? "30d" }),
	loader: ({ deps }) =>
		getOverview({ data: { period: deps.period, demo: true } }),
	component: DemoOverview,
});

function DemoOverview() {
	const data = Route.useLoaderData();
	const navigate = useNavigate();
	return (
		<>
			<PageHeader title="Overview" meta={data.product?.name ?? "All products"}>
				<PeriodSelect
					value={data.period.key}
					onChange={(period) => navigate({ to: "/demo", search: { period } })}
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
