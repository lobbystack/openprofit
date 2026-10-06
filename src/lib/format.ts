export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF"] as const;

export function money(
	n: number,
	opts: { cents?: boolean; currency?: string } = {},
) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: opts.currency ?? "USD",
		maximumFractionDigits: opts.cents ? 2 : 0,
	}).format(n);
}

export function delta(series: number[]) {
	const a = series[series.length - 2];
	const b = series[series.length - 1];
	if (!a) return 0;
	return ((b - a) / a) * 100;
}

export function monthLabel(ym: string) {
	const [y, m] = ym.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", {
		month: "short",
		timeZone: "UTC",
	});
}
