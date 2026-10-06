import { register } from "./registry";
import {
	ConnectorError,
	type CostLine,
	type Credentials,
	getJson,
	splitCents,
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

export type FirecrawlPeriod = {
	startDate: string;
	endDate: string;
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
	const r = await getJson<{ data: { planCredits: number } }>(
		`${API}/credit-usage`,
		{ headers: headers(c) },
	);
	return r.data;
}

// One plan line and one extra-credits line per billing period and API key.
// Each key carries its share of the period's credits. Every period is priced
// at the current plan. Extra credits are the credits above the allotment,
// rounded up to whole $5 packs.
export function firecrawlLines(
	periods: FirecrawlPeriod[],
	plan: (typeof FIRECRAWL_PLANS)[string],
	yearly: boolean,
): CostLine[] {
	const byPeriod = new Map<string, Map<string, number>>();
	for (const p of periods) {
		const day = p.startDate.slice(0, 10);
		const keys = byPeriod.get(day) ?? new Map<string, number>();
		const key = p.apiKey ? keyLabel(p.apiKey) : "";
		keys.set(key, (keys.get(key) ?? 0) + (p.totalCredits ?? 0));
		byPeriod.set(day, keys);
	}
	const out: CostLine[] = [];
	for (const [day, keys] of byPeriod) {
		const used = [...keys.values()].reduce((a, b) => a + b, 0);
		for (const k of [...keys.keys()]) if (!keys.get(k)) keys.delete(k);
		// A period with no usage puts the fee on the connection. Once keys
		// have usage, that line drops to zero instead of counting twice.
		if (!used) keys.set("", 1);
		else if (!keys.has("")) keys.set("", 0);
		const extra = plan.pack
			? Math.ceil(Math.max(0, used - plan.credits) / plan.pack) * PACK_CENTS
			: 0;
		const fee = yearly ? Math.round(plan.yearly / 12) : plan.monthly;
		for (const [service, total] of [
			["Plan", fee],
			["Extra credits", extra],
		] as const) {
			if (!total) continue;
			const names = [...keys.keys()];
			const parts = splitCents(total, [...keys.values()]);
			names.forEach((name, i) => {
				out.push({
					externalId: `${day}:${name || "none"}:${service === "Plan" ? "plan" : "extra"}`,
					date: day,
					currency: "USD",
					amountCents: parts[i],
					service,
					subUnitId: name || undefined,
					subUnitLabel: name || undefined,
				});
			});
		}
	}
	return out;
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
	async fetchCosts(c, range) {
		const plan = planFor(c, (await creditUsage(c)).planCredits);
		// https://docs.firecrawl.dev/api-reference/endpoint/credit-usage-historical (read 2026-10-06)
		const r = await getJson<{ periods: FirecrawlPeriod[] }>(
			`${API}/credit-usage/historical?byApiKey=true`,
			{ headers: headers(c) },
		);
		return firecrawlLines(
			r.periods.filter((p) => p.endDate.slice(0, 10) >= range.from),
			plan,
			c.billing === "yearly",
		);
	},
});
