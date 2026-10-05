// Static numbers for the landing page. The app reads the database.
import type { OverviewData } from "#/lib/overview";

export { delta, money } from "#/lib/format";

const MONTHS = [
	"2025-11",
	"2025-12",
	"2026-01",
	"2026-02",
	"2026-03",
	"2026-04",
	"2026-05",
	"2026-06",
	"2026-07",
	"2026-08",
	"2026-09",
	"2026-10",
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

export const PRODUCTS = [
	{
		id: "draftly",
		name: "Draftly",
		slug: "draftly",
		publicPage: "off" as const,
		revenue: 7240,
		costs: 1890,
	},
	{
		id: "shipmail",
		name: "Shipmail",
		slug: "shipmail",
		publicPage: "off" as const,
		revenue: 3610,
		costs: 720,
	},
	{
		id: "quoteflow",
		name: "Quoteflow",
		slug: "quoteflow",
		publicPage: "off" as const,
		revenue: 1630,
		costs: 502,
	},
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

export const MOCK_OVERVIEW: OverviewData = {
	currency: "USD",
	workspaceSlug: "acme",
	months: MONTHS,
	series: SERIES,
	byProduct: PRODUCTS,
	costsByProvider: COSTS_BY_PROVIDER.map((c) => ({
		provider: c.id,
		amount: c.amount,
	})),
	revenueBySource: REVENUE_BY_SOURCE.map((r) => ({
		provider: r.id,
		amount: r.amount,
	})),
};
