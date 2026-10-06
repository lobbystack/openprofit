export type Plan = "free" | "indie" | "pro";

// Sync cadences a workspace can pick, in minutes.
export const CADENCES = [15, 60, 360, 1440] as const;

// Hosted plans. Self-host ignores all of this.
export const PLANS: Record<
	Plan,
	{
		name: string;
		priceCents: number;
		cadenceMinutes: number;
		// Free tier ends here. Null means no cap.
		mrrCapCents: number | null;
	}
> = {
	free: {
		name: "Free",
		priceCents: 0,
		cadenceMinutes: 360,
		mrrCapCents: 250_000,
	},
	indie: {
		name: "Indie",
		priceCents: 1900,
		cadenceMinutes: 60,
		mrrCapCents: 2_500_000,
	},
	pro: { name: "Pro", priceCents: 4900, cadenceMinutes: 15, mrrCapCents: null },
};
