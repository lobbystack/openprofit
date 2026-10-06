import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "#/components/app/shell";
import {
	OverviewBreakdowns,
	OverviewCard,
} from "#/components/dashboard/overview";
import { PeriodSelect } from "#/components/dashboard/period-select";
import { money } from "#/lib/format";
import {
	type OverviewData,
	type PeriodKey,
	periodSchema,
} from "#/lib/overview";
import { getOverview } from "#/server/overview.functions";

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
					<p className="text-[14px]">
						Connect Stripe, Paddle or another revenue source. Profit shows here
						after the first sync.
					</p>
					<Link
						to="/app/connections"
						className="inline-flex h-8 items-center rounded-md bg-ink px-3 text-[13px] text-paper hover:bg-ink-2"
					>
						Add a connection
					</Link>
				</div>
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

// Tax customers paid in the period. Shown only when there is any.
function TaxRow({ data }: { data: OverviewData }) {
	const tax = data.period.tax;
	if (!tax || (!tax.total && !tax.previous)) return null;
	const fmt = (n: number) => money(n, { currency: data.currency });
	const d = ((tax.total - tax.previous) / tax.previous) * 100;
	return (
		<div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-line bg-card px-5 py-3 text-[13px]">
			<span className="text-text-3">Tax collected</span>
			<span className="num">{fmt(tax.total)}</span>
			{tax.previous !== 0 && (
				<span className="num text-[12px] text-text-3">
					{d >= 0 ? "+" : ""}
					{d.toFixed(1)}%
				</span>
			)}
			<span className="ml-auto text-text-3">
				{tax.owed <= 0
					? "Your providers file it"
					: tax.owed >= tax.total
						? "Yours to file"
						: `${fmt(tax.owed)} is yours to file`}
			</span>
		</div>
	);
}
