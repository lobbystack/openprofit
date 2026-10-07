import { Download } from "lucide-react";
import { useState } from "react";
import { AreaChart } from "#/components/dashboard/area-chart";
import { BreakdownCard } from "#/components/dashboard/breakdown-card";
import { providerLabel } from "#/components/dashboard/overview";
import { Button, buttonVariants } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { money, monthLabel } from "#/lib/format";
import type { OverviewData } from "#/lib/overview";
import type { FlatCostRow } from "#/server/costs.functions";

// The Costs page's chart and its two breakdowns, in /app and /demo.
export function CostsCharts({ overview }: { overview: OverviewData }) {
	const fmt = (n: number) => money(n, { currency: overview.currency });
	return (
		<>
			<Card className="mt-4 px-3 pt-4 pb-2">
				<AreaChart
					data={overview.series.costs}
					previous={overview.previousSeries.costs}
					months={overview.months}
					tone="negative"
					height={200}
					currency={overview.currency}
				/>
			</Card>

			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<BreakdownCard
					tabs={["By provider"]}
					total={overview.costsByProvider.reduce((a, c) => a + c.amount, 0)}
					rows={overview.costsByProvider.map((c) => ({
						label: providerLabel(c.provider),
						value: c.amount,
					}))}
					formatter={fmt}
				/>
				<BreakdownCard
					tabs={["By product"]}
					total={overview.byProduct.reduce((a, p) => a + p.costs, 0)}
					rows={overview.byProduct.map((p) => ({
						label: p.name,
						value: p.costs,
					}))}
					formatter={fmt}
				/>
			</div>
		</>
	);
}

const monthYear = (day: string) =>
	`${monthLabel(day.slice(0, 7))} ${day.slice(0, 4)}`;

const span = (f: FlatCostRow) =>
	f.endsOn
		? `${monthYear(f.startsOn)} to ${monthYear(f.endsOn)}`
		: `Since ${monthYear(f.startsOn)}`;

// Downloads /api/export.csv for a date range, this calendar year by default.
export function ExportCsv() {
	const year = new Date().getFullYear();
	const [from, setFrom] = useState(`${year}-01-01`);
	const [to, setTo] = useState(`${year}-12-31`);
	return (
		<Dialog>
			<DialogTrigger render={<Button variant="outline" />}>
				<Download size={13} />
				Export CSV
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Export CSV</DialogTitle>
					<DialogDescription>
						Revenue, synced costs and flat costs between the two dates, in one
						file. Costs are negative, so the Amount column adds up to profit.
					</DialogDescription>
				</DialogHeader>
				<FieldGroup className="grid grid-cols-2 gap-3">
					<Field className="gap-1.5">
						<FieldLabel htmlFor="export-from">From</FieldLabel>
						<Input
							id="export-from"
							size="sm"
							type="date"
							required
							value={from}
							onChange={(e) => setFrom(e.target.value)}
							className="num"
						/>
					</Field>
					<Field className="gap-1.5">
						<FieldLabel htmlFor="export-to">To</FieldLabel>
						<Input
							id="export-to"
							size="sm"
							type="date"
							required
							min={from}
							value={to}
							onChange={(e) => setTo(e.target.value)}
							className="num"
						/>
					</Field>
				</FieldGroup>
				<a
					href={`/api/export.csv?from=${from}&to=${to}`}
					download
					className={buttonVariants({ className: "justify-self-start" })}
				>
					Download
				</a>
			</DialogContent>
		</Dialog>
	);
}

// One flat cost in the list. Children are the app's edit and remove buttons.
export function FlatCostItem({
	cost: f,
	children,
}: {
	cost: FlatCostRow;
	children?: React.ReactNode;
}) {
	return (
		<li className="flex min-h-11 items-center gap-3 px-4 py-2 text-[13px]">
			<span className="min-w-0 flex-1">
				<span className="block truncate">{f.name}</span>
				<span className="block text-[12px] text-text-3">{span(f)}</span>
			</span>
			<span className="hidden w-32 truncate text-text-2 sm:block">
				{f.product ?? "Unassigned"}
			</span>
			<span className="num w-24 text-right">
				{money(f.amount, { currency: f.currency, cents: true })}
			</span>
			<span className="label-mono w-10 text-right">
				/ {f.interval === "year" ? "yr" : "mo"}
			</span>
			{children && (
				<span className="flex shrink-0 items-center gap-1">{children}</span>
			)}
		</li>
	);
}
