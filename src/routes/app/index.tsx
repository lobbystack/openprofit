import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, ChevronDown } from "lucide-react";
import { Control, PageHeader } from "#/components/app/shell";
import {
	OverviewBreakdowns,
	OverviewCard,
} from "#/components/dashboard/overview";
import { getOverview } from "#/server/overview.functions";

export const Route = createFileRoute("/app/")({
	loader: () => getOverview(),
	component: Overview,
});

function Overview() {
	const data = Route.useLoaderData();
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
				<Control>
					<Calendar size={13} />
					This month
					<ChevronDown size={13} className="text-text-3" />
				</Control>
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
