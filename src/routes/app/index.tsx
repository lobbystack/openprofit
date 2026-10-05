import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Calendar } from "lucide-react";
import { PageHeader } from "#/components/app/shell";
import {
	OverviewBreakdowns,
	OverviewCard,
} from "#/components/dashboard/overview";
import { PERIODS, type PeriodKey } from "#/lib/overview";
import { getOverview, periodSchema } from "#/server/overview.functions";

export const Route = createFileRoute("/app/")({
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
				<div className="mt-4 flex flex-col items-start gap-4 rounded-xl border border-line bg-card p-6">
					<p className="text-[14px]">Connect a revenue source to see profit.</p>
					<Link
						to="/app/connections"
						className="inline-flex h-8 items-center rounded-md bg-ink px-3 text-[13px] text-paper hover:bg-ink-2"
					>
						Connect
					</Link>
				</div>
			</>
		);
	}
	return (
		<>
			<PageHeader title="Overview" meta="All products">
				<label className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 text-[13px] hover:border-line-strong">
					<Calendar size={13} className="text-text-3" />
					<select
						value={data.period.key}
						onChange={(e) =>
							navigate({
								to: "/app",
								search: { period: e.target.value as PeriodKey },
							})
						}
						className="bg-transparent outline-none"
					>
						{PERIODS.map((p) => (
							<option key={p.key} value={p.key}>
								{p.label}
							</option>
						))}
					</select>
				</label>
			</PageHeader>
			<div className="mt-4">
				<OverviewCard data={data} />
			</div>
			<div className="mt-4">
				<OverviewBreakdowns data={data} full />
			</div>
		</>
	);
}
