import { z } from "zod";

// Shape shared by the landing preview (mock) and the app (database).

export type MetricKey = "revenue" | "costs" | "profit" | "mrr" | "customers";

export const METRICS: { key: MetricKey; label: string; money: boolean }[] = [
	{ key: "revenue", label: "Revenue", money: true },
	{ key: "costs", label: "Costs", money: true },
	{ key: "profit", label: "Profit", money: true },
	{ key: "mrr", label: "MRR", money: true },
	{ key: "customers", label: "Customers", money: false },
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
	}[];
	costsByProvider: { provider: string; amount: number }[];
	revenueBySource: { provider: string; amount: number }[];
};
