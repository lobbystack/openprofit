// Shape shared by the landing preview (mock) and the app (database).

export type MetricKey = "revenue" | "costs" | "profit" | "mrr" | "customers";

export const METRICS: { key: MetricKey; label: string; money: boolean }[] = [
	{ key: "revenue", label: "Revenue", money: true },
	{ key: "costs", label: "Costs", money: true },
	{ key: "profit", label: "Profit", money: true },
	{ key: "mrr", label: "MRR", money: true },
	{ key: "customers", label: "Customers", money: false },
];

export type OverviewData = {
	currency: string;
	workspaceSlug: string;
	// YYYY-MM, oldest first. Money series are whole units, not cents.
	months: string[];
	series: Record<MetricKey, number[]>;
	// Current month.
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
