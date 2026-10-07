export type RuleKind = "cost_spike" | "margin_floor" | "sync_failure";

export const RULE_NAMES: Record<RuleKind, string> = {
	cost_spike: "Cost spike",
	margin_floor: "Margin floor",
	sync_failure: "Sync failure",
};

// What a rule watches, in words, for the Alerts page.
export function ruleScope(kind: RuleKind, threshold: number | null) {
	if (kind === "cost_spike")
		return `Any provider whose spend for a day passes ${Math.round(((threshold ?? 1) + 1) * 10) / 10}x its daily average of the 7 days before`;
	if (kind === "margin_floor")
		return `Any product under ${Math.round((threshold ?? 0.6) * 100)}% margin over the last 7 days`;
	return "Any connection whose sync fails";
}

// Hosted plans with SMS (Indie, Pro) send at most this many a month.
export const SMS_CAP = 30;
