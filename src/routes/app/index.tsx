import { createFileRoute } from "@tanstack/react-router";
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
