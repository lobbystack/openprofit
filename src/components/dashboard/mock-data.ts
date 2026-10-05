// Static numbers for the landing page and the dashboard prototype.

export const MONTHS = [
	"Nov",
	"Dec",
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
];

export const SERIES = {
	revenue: [
		6120, 6480, 7010, 7390, 7820, 8350, 8910, 9420, 10080, 10760, 11540, 12480,
	],
	costs: [
		1480, 1520, 1610, 1740, 1890, 2050, 2210, 2380, 2590, 2770, 2960, 3112,
	],
	profit: [
		4640, 4960, 5400, 5650, 5930, 6300, 6700, 7040, 7490, 7990, 8580, 9368,
	],
	mrr: [
		5900, 6200, 6700, 7050, 7500, 8000, 8550, 9050, 9700, 10350, 11100, 11900,
	],
	customers: [212, 224, 241, 256, 273, 291, 312, 331, 356, 378, 399, 418],
};

export type MetricKey = keyof typeof SERIES;

export const METRICS: { key: MetricKey; label: string; money: boolean }[] = [
	{ key: "revenue", label: "Revenue", money: true },
	{ key: "costs", label: "Costs", money: true },
	{ key: "profit", label: "Profit", money: true },
	{ key: "mrr", label: "MRR", money: true },
	{ key: "customers", label: "Customers", money: false },
];

export const PRODUCTS = [
	{ name: "Draftly", revenue: 7240, costs: 1890 },
	{ name: "Shipmail", revenue: 3610, costs: 720 },
	{ name: "Quoteflow", revenue: 1630, costs: 502 },
];

export const COSTS_BY_PROVIDER = [
	{ id: "openai", amount: 1412 },
	{ id: "vercel", amount: 640 },
	{ id: "anthropic", amount: 486 },
	{ id: "railway", amount: 214 },
	{ id: "cloudflare", amount: 120 },
	{ id: "supabase", amount: 100 },
	{ id: "resend", amount: 80 },
	{ id: "stripe", amount: 60 },
] as const;

export const REVENUE_BY_SOURCE = [
	{ id: "stripe", amount: 9860 },
	{ id: "polar", amount: 2620 },
] as const;

export function money(n: number, opts: { cents?: boolean } = {}) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: opts.cents ? 2 : 0,
	}).format(n);
}

export function delta(series: number[]) {
	const a = series[series.length - 2];
	const b = series[series.length - 1];
	return ((b - a) / a) * 100;
}
