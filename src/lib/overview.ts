import { z } from "zod";

// Shape shared by the landing preview (mock) and the app (database).

export type MetricKey = "revenue" | "costs" | "profit" | "mrr" | "customers";

export const METRICS: {
	key: MetricKey;
	label: string;
	money: boolean;
	// What the number counts, shown on hover.
	hint: string;
}[] = [
	{
		key: "revenue",
		label: "Revenue",
		money: true,
		hint: "After refunds, sales tax and the processor fees your provider reports",
	},
	{
		key: "costs",
		label: "Costs",
		money: true,
		hint: "Synced costs plus flat costs",
	},
	{
		key: "profit",
		label: "Profit",
		money: true,
		hint: "Revenue minus costs",
	},
	{
		key: "mrr",
		label: "MRR",
		money: true,
		hint: "Monthly recurring revenue at the end of the period",
	},
	{
		key: "customers",
		label: "Subscriptions",
		money: false,
		hint: "Active subscriptions at the end of the period",
	},
];

export type PeriodKey = "this-month" | "last-month" | "3m" | "12m" | "ytd";

export const periodSchema = z
	.enum(["this-month", "last-month", "3m", "12m", "ytd"])
	.default("this-month");

export const PERIODS: { key: PeriodKey; label: string }[] = [
	{ key: "this-month", label: "This month" },
	{ key: "last-month", label: "Last month" },
	{ key: "3m", label: "Last 3 months" },
	{ key: "12m", label: "Last 12 months" },
	{ key: "ytd", label: "This year" },
];

export type OverviewData = {
	currency: string;
	workspaceSlug: string;
	// The switcher's product these numbers cover; null is All.
	product: { id: string; name: string } | null;
	// MRR and subscriptions are known. A product only has them when a
	// revenue connection is assigned to it as a whole.
	snapshots: boolean;
	// YYYY-MM, oldest first. Money series are whole units, not cents.
	months: string[];
	series: Record<MetricKey, number[]>;
	// Same months one year earlier, for the dotted line.
	previousSeries: Record<MetricKey, number[]>;
	// Tiles: the period's totals and the equal period before it. Flows sum;
	// MRR and customers take the value at the end.
	period: {
		key: PeriodKey;
		label: string;
		totals: Record<MetricKey, number>;
		previous: Record<MetricKey, number>;
		// Tax customers paid, kept out of every metric. `owed` is the part
		// from providers that don't remit it.
		tax?: { total: number; previous: number; owed: number };
	};
	// Breakdowns cover the period.
	byProduct: {
		id: string;
		name: string;
		slug: string;
		publicPage: "off" | "full" | "revenue" | "percent";
		revenue: number;
		costs: number;
		// Monthly profit over `months`, for the product's own trend line.
		profit: number[];
	}[];
	costsByProvider: { provider: string; amount: number }[];
	revenueBySource: { provider: string; amount: number }[];
};
