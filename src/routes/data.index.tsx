import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Footer } from "#/components/landing/footer";
import { Nav } from "#/components/landing/nav";
import { Card } from "#/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { seo } from "#/lib/app";
import {
	ACTIVATION,
	BANDS,
	formatValue,
	METRICS,
	type Metric,
	MIN_COHORT,
	monthName,
	type Snapshot,
} from "#/lib/benchmarks";
import { getBenchmarks } from "#/server/benchmarks.functions";

export const Route = createFileRoute("/data/")({
	loader: () => getBenchmarks(),
	head: ({ loaderData }) =>
		seo({
			title: "SaaS benchmarks by MRR · OpenProfit",
			description: loaderData?.description,
			path: "/data",
		}),
	component: DataPage,
});

function DataPage() {
	const { title, description, html, rows } = Route.useLoaderData();
	return (
		<>
			<Nav />
			<main className="mx-auto w-full max-w-[720px] px-4 pt-28 pb-24">
				<h1 className="display text-[36px]">{title}</h1>
				<p className="prose-landing mt-3">{description}</p>
				{rows.length ? (
					<Figures rows={rows} />
				) : (
					<Card className="mt-10 p-6 text-[14px]">
						No figures yet. Publishing starts with the first month in which{" "}
						{ACTIVATION} workspaces qualify, on the 3rd of the month after.
					</Card>
				)}
				<article
					className="prose-docs mt-12"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: our own markdown
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			</main>
			<Footer />
		</>
	);
}

// One metric at a time: the latest month's percentiles per band, then the
// median for every published month.
function Figures({ rows }: { rows: Snapshot[] }) {
	const [metric, setMetric] = useState<Metric>("gross_margin");
	const latest = rows[0].month;
	const picked = rows.filter((r) => r.metric === metric);
	const months = [...new Set(rows.map((r) => r.month))];
	const cell = (month: string, band: string) =>
		picked.find((r) => r.month === month && r.band === band);
	const fmt = (v: number) => formatValue(metric, v);
	const right = "text-right";

	return (
		<section className="mt-10">
			<ToggleGroup
				variant="outline"
				aria-label="Metric"
				value={[metric]}
				onValueChange={(v) => v[0] && setMetric(v[0] as Metric)}
				className="flex-wrap"
			>
				{METRICS.map((m) => (
					<ToggleGroupItem key={m.key} value={m.key}>
						{m.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			<p className="mt-3 text-[13px] text-text-2">
				{METRICS.find((m) => m.key === metric)?.hint}
			</p>

			<h2 className="mt-8 text-[18px]">{monthName(latest)}</h2>
			<Card className="mt-3">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>MRR</TableHead>
							<TableHead className={right}>Workspaces</TableHead>
							<TableHead className={right}>25th</TableHead>
							<TableHead className={right}>Median</TableHead>
							<TableHead className={right}>75th</TableHead>
							<TableHead className={right}>90th</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{BANDS.map((b) => {
							const r = cell(latest, b.key);
							return (
								<TableRow key={b.key} className="h-10">
									<TableCell>{b.label}</TableCell>
									{r ? (
										<>
											<TableCell className={`num ${right}`}>{r.n}</TableCell>
											{(["p25", "p50", "p75", "p90"] as const).map((k) => (
												<TableCell key={k} className={`num ${right}`}>
													{fmt(r[k])}
												</TableCell>
											))}
										</>
									) : (
										<TableCell colSpan={5} className="text-text-3">
											Fewer than {MIN_COHORT} workspaces
										</TableCell>
									)}
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</Card>

			<h2 className="mt-10 text-[18px]">Median by month</h2>
			<Card className="mt-3">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Month</TableHead>
							{BANDS.map((b) => (
								<TableHead key={b.key} className={right}>
									{b.label}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{months.map((m) => (
							<TableRow key={m} className="h-10">
								<TableCell>{monthName(m)}</TableCell>
								{BANDS.map((b) => {
									const r = cell(m, b.key);
									return (
										<TableCell
											key={b.key}
											className={`num ${right} ${r ? "" : "text-text-3"}`}
										>
											{r ? fmt(r.p50) : "–"}
										</TableCell>
									);
								})}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>
		</section>
	);
}
