import { register } from "./registry";
import {
	ConnectorError,
	type CostLine,
	type Credentials,
	getJson,
	type SyncRange,
	toCents,
} from "./types";

const BASE = "https://api.vercel.com";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.token}` });

type Charge = {
	BilledCost: number;
	BillingCurrency: string;
	ChargeCategory: string;
	ChargePeriodStart: string;
	ServiceName: string;
	SkuId: string;
	Tags?: Record<string, string>;
};

async function teamId(c: Credentials) {
	if (c.teamId?.trim()) return c.teamId.trim();
	const u = await getJson<{ user: { defaultTeamId: string | null } }>(
		`${BASE}/v2/user`,
		{
			headers: headers(c),
		},
	);
	if (!u.user.defaultTeamId)
		throw new ConnectorError("No team on this token. Set a team id.");
	return u.user.defaultTeamId;
}

export const vercel = register({
	id: "vercel",
	name: "Vercel",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{
				name: "token",
				label: "Access token",
				placeholder: "vcp_…",
				secret: true,
			},
			{
				name: "teamId",
				label: "Team id (optional)",
				placeholder: "team_…",
				optional: true,
			},
		],
		createUrl: "https://vercel.com/account/tokens",
		scopes: ["Scope: the team to read", "Role on the team: Billing or higher"],
	},
	async verify(c) {
		const u = await getJson<{ user: { username: string } }>(`${BASE}/v2/user`, {
			headers: headers(c),
		});
		const team = await teamId(c);
		return { label: `${u.user.username} · ${team}` };
	},
	// FOCUS charges, one JSON object per line.
	async fetchCosts(c, range: SyncRange) {
		const team = await teamId(c);
		const to = new Date(
			Date.parse(`${range.to}T00:00:00Z`) + 86_400_000,
		).toISOString();
		const res = await fetch(
			`${BASE}/v1/billing/charges?teamId=${team}&from=${range.from}T00:00:00.000Z&to=${to}`,
			{ headers: headers(c) },
		);
		if (!res.ok)
			throw new ConnectorError(
				`${res.status} ${await res.text().catch(() => "")}`.slice(0, 200),
				res.status,
			);
		const text = await res.text();
		const out: CostLine[] = [];
		for (const line of text.split("\n")) {
			if (!line.trim()) continue;
			const r = JSON.parse(line) as Charge;
			if (!r.BilledCost) continue;
			const project =
				Object.entries(r.Tags ?? {}).find(([k]) =>
					/project.?id/i.test(k),
				)?.[1] ?? undefined;
			const projectName =
				Object.entries(r.Tags ?? {}).find(([k]) =>
					/project.?name/i.test(k),
				)?.[1] ?? undefined;
			out.push({
				externalId: `${r.ChargePeriodStart.slice(0, 10)}:${r.SkuId}:${project ?? ""}:${r.ChargeCategory}`,
				date: r.ChargePeriodStart.slice(0, 10),
				currency: (r.BillingCurrency ?? "USD").toUpperCase(),
				amountCents: toCents(r.BilledCost),
				service: r.ServiceName,
				subUnitId: project,
				subUnitLabel: projectName,
			});
		}
		return out;
	},
});
