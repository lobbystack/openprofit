// Benchmark cohorts, shared by the computation, the /data page and the
// overview. Money is in USD cents, ratios in percent.

export const ACTIVATION = 50; // workspaces in a month before anything publishes
export const MIN_COHORT = 10; // workspaces per band and metric
export const AI_PROVIDERS = ["openai", "anthropic", "openrouter", "xai"];

export type Band = "0-1k" | "1k-5k" | "5k-20k" | "20k+";
export const BANDS: { key: Band; label: string; below: number }[] = [
	{ key: "0-1k", label: "$0–1k", below: 100_000 },
	{ key: "1k-5k", label: "$1k–5k", below: 500_000 },
	{ key: "5k-20k", label: "$5k–20k", below: 2_000_000 },
	{ key: "20k+", label: "$20k+", below: Number.POSITIVE_INFINITY },
];
export const bandFor = (usdCents: number) =>
	(BANDS.find((b) => usdCents < b.below) ?? BANDS[3]).key;
export const bandLabel = (band: string) =>
	BANDS.find((b) => b.key === band)?.label ?? band;

export type Metric = "revenue" | "gross_margin" | "total_costs" | "ai_costs";
export const METRICS: { key: Metric; label: string; hint: string }[] = [
	{
		key: "revenue",
		label: "Revenue",
		hint: "Revenue for the month after refunds, sales tax and processor fees, in US dollars.",
	},
	{
		key: "gross_margin",
		label: "Gross margin",
		hint: "Revenue minus the costs connected providers report, as a share of revenue.",
	},
	{
		key: "total_costs",
		label: "Total costs",
		hint: "Provider costs plus flat costs, as a share of revenue.",
	},
	{
		key: "ai_costs",
		label: "AI costs",
		hint: "OpenAI, Anthropic, OpenRouter and xAI costs, as a share of revenue.",
	},
];

export type Snapshot = {
	month: string;
	band: Band;
	metric: Metric;
	n: number;
	p25: number;
	p50: number;
	p75: number;
	p90: number;
};

// Linear interpolation between closest ranks, as numpy and Excel's
// PERCENTILE.INC do. `sorted` is ascending and not empty.
export function percentile(sorted: number[], p: number) {
	const i = (sorted.length - 1) * p;
	const lo = Math.floor(i);
	return sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo);
}

// "$8,240" for money in cents, "64.2%" for ratios.
export const formatValue = (metric: Metric, v: number) =>
	metric === "revenue"
		? `$${Math.round(v / 100).toLocaleString("en-US")}`
		: `${v.toFixed(1)}%`;

export const monthName = (ym: string) =>
	new Date(`${ym}-01T00:00:00Z`).toLocaleString("en-US", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
