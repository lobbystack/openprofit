import { z } from "zod";

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF"] as const;

// An IANA time zone name the server's Intl knows, such as "Europe/Paris".
export const TimeZone = z.string().refine((timeZone) => {
	try {
		new Intl.DateTimeFormat("en-US", { timeZone });
		return true;
	} catch {
		return false;
	}
});

// How often connections sync, as Settings and the connections list say it.
export const cadenceLabel = (minutes: number) =>
	minutes === 15
		? "Every 15 minutes"
		: minutes === 60
			? "Every hour"
			: minutes === 360
				? "Every 6 hours"
				: minutes >= 1440
					? "Every day"
					: `Every ${minutes} minutes`;

export function money(
	n: number,
	opts: { cents?: boolean; currency?: string } = {},
) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: opts.currency ?? "USD",
		maximumFractionDigits: opts.cents ? 2 : 0,
		// A loss that rounds to zero reads $0, not -$0.
		signDisplay: "negative",
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

// "2026-10-08" → "October 8, 2026".
export const dayLabel = (day: string) =>
	new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
		timeZone: "UTC",
	});
