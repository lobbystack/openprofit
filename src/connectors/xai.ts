import { register } from "./registry";
import {
	ConnectorError,
	type CostLine,
	type Credentials,
	getJson,
	type SyncRange,
	toCents,
} from "./types";

const BASE = "https://management-api.x.ai";
const headers = (c: Credentials) => ({
	Authorization: `Bearer ${c.key}`,
	"Content-Type": "application/json",
});

const addDays = (d: string, n: number) =>
	new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000)
		.toISOString()
		.slice(0, 10);

type Usage = {
	timeSeries: {
		group: string[];
		dataPoints: { timestamp: string; values: number[] }[];
	}[];
	limitReached: boolean;
};

// The management key is tied to one team; an organization key needs the id.
// https://docs.x.ai/developers/rest-api-reference/management/auth (GET /auth/management-keys/validation, read 2026-10-06)
async function team(c: Credentials) {
	const k = await getJson<{
		name?: string;
		teamId?: string;
		scope?: string;
		scopeId?: string;
	}>(`${BASE}/auth/management-keys/validation`, { headers: headers(c) });
	const id =
		c.teamId?.trim() ||
		(k.scope === "SCOPE_TEAM" ? k.scopeId : undefined) ||
		k.teamId;
	if (!id)
		throw new ConnectorError("This key isn't tied to a team. Set the team id.");
	return { id, keyName: k.name };
}

// Daily USD per billing description ("Chat grok-4-0709", an image model…).
// This is usage as it's charged, so prepaid top-ups never count twice.
// https://docs.x.ai/developers/rest-api-reference/management/billing (POST /v1/billing/teams/{team_id}/usage, read 2026-10-06)
async function usage(c: Credentials, teamId: string, from: string, to: string) {
	return getJson<Usage>(`${BASE}/v1/billing/teams/${teamId}/usage`, {
		method: "POST",
		headers: headers(c),
		body: JSON.stringify({
			analyticsRequest: {
				// endTime is exclusive.
				timeRange: {
					startTime: `${from} 00:00:00`,
					endTime: `${addDays(to, 1)} 00:00:00`,
					timezone: "Etc/GMT",
				},
				timeUnit: "TIME_UNIT_DAY",
				values: [{ name: "usd", aggregation: "AGGREGATION_SUM" }],
				groupBy: ["description"],
				filters: [],
			},
		}),
	});
}

export function usageLines(r: Usage): CostLine[] {
	const out: CostLine[] = [];
	for (const s of r.timeSeries ?? []) {
		const service = s.group?.[0] || "Usage";
		for (const p of s.dataPoints ?? []) {
			const cents = toCents(p.values?.[0] ?? 0);
			if (!cents) continue;
			const date = p.timestamp.slice(0, 10);
			out.push({
				externalId: `${date}:${service}`,
				date,
				currency: "USD",
				amountCents: cents,
				service,
			});
		}
	}
	return out;
}

export const xai = register({
	id: "xai",
	name: "xAI",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{
				name: "key",
				label: "Management key",
				placeholder: "xai-…",
				secret: true,
			},
			{
				name: "teamId",
				label: "Team id (only for an organization key)",
				optional: true,
			},
		],
		createUrl: "https://console.x.ai/team/default/management-keys",
		scopes: [
			"Management key from Settings → Management Keys, separate from your API keys",
		],
	},
	async verify(c) {
		const t = await team(c);
		const today = new Date().toISOString().slice(0, 10);
		await usage(c, t.id, today, today);
		// https://docs.x.ai/developers/rest-api-reference/management/billing (GET /v1/billing/teams/{team_id}/billing-info, read 2026-10-06)
		const info = await getJson<{ billingInfo?: { name?: string } }>(
			`${BASE}/v1/billing/teams/${t.id}/billing-info`,
			{ headers: headers(c) },
		).catch(() => null);
		return { label: info?.billingInfo?.name || t.keyName || "xAI" };
	},
	async fetchCosts(c, range: SyncRange) {
		const t = await team(c);
		const out: CostLine[] = [];
		for (let from = range.from; from <= range.to; from = addDays(from, 31)) {
			const to = addDays(from, 30) < range.to ? addDays(from, 30) : range.to;
			const r = await usage(c, t.id, from, to);
			// Partial data would undercount silently; fail so the user sees it.
			if (r.limitReached)
				throw new ConnectorError(
					`xAI returned partial usage for ${from} to ${to}.`,
				);
			out.push(...usageLines(r));
		}
		return out;
	},
});
