import { createFileRoute } from "@tanstack/react-router";
import { Calendar, ChevronDown } from "lucide-react";
import { Control, PageHeader } from "#/components/app/shell";
import {
	OverviewBreakdowns,
	OverviewCard,
} from "#/components/dashboard/overview";

export const Route = createFileRoute("/app/")({ component: Overview });

function Overview() {
	return (
		<>
			<PageHeader title="Overview" meta="All products">
				<Control>
					<Calendar size={13} />
					This month
					<ChevronDown size={13} className="text-text-3" />
				</Control>
				<Control muted>
					<span className="h-1.5 w-1.5 rounded-full bg-positive" />
					Synced 4 min ago
				</Control>
			</PageHeader>
			<div className="mt-4">
				<OverviewCard />
			</div>
			<div className="mt-4">
				<OverviewBreakdowns full />
			</div>
		</>
	);
}
