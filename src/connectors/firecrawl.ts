import { register } from "./registry";
import {
	ConnectorError,
	type CostLine,
	type Credentials,
	getJson,
	splitByUsage,
} from "./types";

const API = "https://api.firecrawl.dev/v2/team";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.key}` });

// Firecrawl reports credits, not dollars. Published plans, read 2026-10-06:
// https://www.firecrawl.dev/pricing.md (prices, extra credits per $5) and
// https://docs.firecrawl.dev/billing.md (monthly allotment, $5 increments).
// Cents; `yearly` is the price of a year billed yearly.
export const FIRECRAWL_PLANS: Record<
	string,
	{
		label: string;
		credits: number;
		monthly: number;
		yearly: number;
		pack: number;
	}
> = {
	free: { label: "Free", credits: 1_000, monthly: 0, yearly: 0, pack: 0 },
	hobby: {
		label: "Hobby",
		credits: 5_000,
		monthly: 1_900,
		yearly: 19_000,
		pack: 1_000,
	},
	standard: {
		label: "Standard",
		credits: 100_000,
		monthly: 9_900,
		yearly: 99_000,
		pack: 2_000,
	},
	growth: {
		label: "Growth",
		credits: 500_000,
		monthly: 39_900,
		yearly: 399_000,
		pack: 2_500,
	},
	scale: {
		label: "Scale",
		credits: 1_000_000,
		monthly: 74_900,
		yearly: 719_000,
		pack: 5_000,
	},
};
const PACK_CENTS = 500;

// The docs type both dates as strings, but accounts on the Free plan get
// periods with null dates (seen 2026-10-07): a null end is a period still
// running, a period without a start is skipped.
export type FirecrawlPeriod = {
	startDate: string | null;
	endDate: string | null;
	apiKey: string | null;
	totalCredits: number;
};

// The API returns key names, but never store something that looks like a key.
const keyLabel = (k: string) =>
	k.startsWith("fc-") ? `fc-…${k.slice(-4)}` : k;

function planFor(c: Credentials, planCredits: number) {
	const id =
		c.plan ||
		Object.keys(FIRECRAWL_PLANS).find(
			(k) => FIRECRAWL_PLANS[k].credits === planCredits,
		);
	if (!id || !FIRECRAWL_PLANS[id])
		throw new ConnectorError(
			`Firecrawl reports a custom plan of ${planCredits.toLocaleString("en-US")} credits a month. Pick the closest plan, or add your contract as a flat cost.`,
		);
	return FIRECRAWL_PLANS[id];
}

// https://docs.firecrawl.dev/api-reference/endpoint/credit-usage (read 2026-10-06)
async function creditUsage(c: Credentials) {
	const r = await getJson<{
		data: { planCredits: number; billingPeriodStart?: string | null };
	}>(`${API}/credit-usage`, { headers: headers(c) });
	return r.data;
}

// One plan line and one extra-credits line per billing period and API key.
// Each key carries its share of the period's credits. Extra credits are the
// credits above the allotment, rounded up to whole $5 packs.
export function firecrawlLines(
	periods: FirecrawlPeriod[],
	plan: (typeof FIRECRAWL_PLANS)[string],
	yearly: boolean,
): CostLine[] {
	const byPeriod = new Map<string, Map<string, number>>();
	for (const p of periods) {
		if (!p.startDate) continue;
		const day = p.startDate.slice(0, 10);
		const keys = byPeriod.get(day) ?? new Map<string, number>();
		const key = p.apiKey ? keyLabel(p.apiKey) : "";
		keys.set(key, (keys.get(key) ?? 0) + (p.totalCredits ?? 0));
		byPeriod.set(day, keys);
	}
	const out: CostLine[] = [];
	for (const [day, keys] of byPeriod) {
		const used = [...keys.values()].reduce((a, b) => a + b, 0);
		const extra = plan.pack
			? Math.ceil(Math.max(0, used - plan.credits) / plan.pack) * PACK_CENTS
			: 0;
		const fee = yearly ? Math.round(plan.yearly / 12) : plan.monthly;
		for (const [service, id, total] of [
			["Plan", "plan", fee],
			["Extra credits", "extra", extra],
		] as const) {
			const parts = splitByUsage(total, keys);
			// A period with no usage puts the fee on the connection. Lines are
			// never deleted (historyDays 0), so once keys have usage that line
			// is written as zero instead of counting the fee twice.
			if (id === "plan" && fee && used && !parts.some(([n]) => !n))
				parts.push(["", 0]);
			for (const [name, cents] of parts)
				out.push({
					externalId: `${day}:${name || "none"}:${id}`,
					date: day,
					currency: "USD",
					amountCents: cents,
					service,
					subUnitId: name || undefined,
					subUnitLabel: name || undefined,
				});
		}
	}
	return out;
}

// The periods of the current billing period: those ending after it began.
// Without a start from the API, the latest period up to `today`.
export function currentPeriod(
	periods: FirecrawlPeriod[],
	billingPeriodStart: string | null | undefined,
	today: string,
) {
	const start =
		billingPeriodStart?.slice(0, 10) ??
		periods
			.flatMap((p) => (p.startDate ? [p.startDate.slice(0, 10)] : []))
			.filter((d) => d <= today)
			.sort()
			.at(-1);
	return start
		? periods.filter(
				(p) => p.startDate && (!p.endDate || p.endDate.slice(0, 10) > start),
			)
		: [];
}

export const firecrawl = register({
	id: "firecrawl",
	name: "Firecrawl",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{ name: "key", label: "API key", placeholder: "fc-…", secret: true },
			{
				name: "plan",
				label: "Plan",
				optional: true,
				options: [
					{ value: "", label: "Detect automatically" },
					...Object.entries(FIRECRAWL_PLANS).map(([value, p]) => ({
						value,
						label: p.label,
					})),
				],
			},
			{
				name: "billing",
				label: "Billing",
				optional: true,
				options: [
					{ value: "", label: "Monthly" },
					{ value: "yearly", label: "Yearly" },
				],
			},
		],
		createUrl: "https://www.firecrawl.dev/app/api-keys",
		scopes: ["Any API key on the team, restricted keys included"],
	},
	async verify(c) {
		const plan = planFor(c, (await creditUsage(c)).planCredits);
		return { label: `Firecrawl ${plan.label}` };
	},
	// Only the current billing period is priced, at the current plan. Past
	// periods keep the figures they had when they closed: they are neither
	// repriced nor deleted.
	historyDays: 0,
	async fetchCosts(c, range) {
		const usage = await creditUsage(c);
		const plan = planFor(c, usage.planCredits);
		// https://docs.firecrawl.dev/api-reference/endpoint/credit-usage-historical (read 2026-10-06)
		const r = await getJson<{ periods: FirecrawlPeriod[] }>(
			`${API}/credit-usage/historical?byApiKey=true`,
			{ headers: headers(c) },
		);
		return firecrawlLines(
			currentPeriod(r.periods, usage.billingPeriodStart, range.to),
			plan,
			c.billing === "yearly",
		);
	},
});
