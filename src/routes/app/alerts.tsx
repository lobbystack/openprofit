import { createFileRoute } from "@tanstack/react-router";
import { Control, PageHeader } from "#/components/app/shell";

export const Route = createFileRoute("/app/alerts")({ component: Alerts });

const ALERTS = [
	{
		when: "Today 06:10",
		title: "OpenAI spend doubled since yesterday",
		detail: "$96 today vs $41 average",
		tone: "negative",
		open: true,
	},
	{
		when: "Mon 09:00",
		title: "Shipmail margin below 60%",
		detail: "58% this week",
		tone: "pending",
		open: true,
	},
	{
		when: "Sep 28",
		title: "Vercel sync failed",
		detail: "Token expired, reconnected Sep 29",
		tone: "ink",
		open: false,
	},
] as const;

const RULES = [
	["Cost spike", "Any provider, +100% day over day"],
	["Margin floor", "Any product, under 60% for a week"],
	["Sync failure", "Any connection"],
] as const;

function Alerts() {
	return (
		<>
			<PageHeader
				title="Alerts"
				meta={`${ALERTS.filter((a) => a.open).length} open`}
			>
				<Control>Add rule</Control>
			</PageHeader>

			<div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
				<ul className="divide-y divide-line">
					{ALERTS.map((a) => (
						<li
							key={a.title}
							className={`flex items-start gap-3 px-4 py-3 ${a.open ? "" : "text-text-3"}`}
						>
							<span
								className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
									!a.open
										? "bg-surface-4"
										: a.tone === "negative"
											? "bg-negative"
											: a.tone === "pending"
												? "bg-pending"
												: "bg-ink"
								}`}
							/>
							<div className="flex-1">
								<div className="text-[13px]">{a.title}</div>
								<div className="num mt-0.5 text-[12px] text-text-2">
									{a.detail}
								</div>
							</div>
							<span className="num text-[12px] text-text-3">{a.when}</span>
						</li>
					))}
				</ul>
			</div>

			<div className="label-mono mt-8">Rules</div>
			<div className="mt-3 overflow-hidden rounded-xl border border-line bg-card">
				<ul className="divide-y divide-line">
					{RULES.map(([name, scope]) => (
						<li key={name} className="flex h-11 items-center px-4 text-[13px]">
							<span className="w-40">{name}</span>
							<span className="flex-1 text-text-2">{scope}</span>
							<span className="flex items-center gap-1.5 text-[12px] text-text-2">
								<span className="h-1.5 w-1.5 rounded-full bg-positive" />
								Email
							</span>
						</li>
					))}
				</ul>
			</div>
		</>
	);
}
