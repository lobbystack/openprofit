import { register } from "./registry";
import {
	ConnectorError,
	type CostLine,
	type Credentials,
	getJson,
	type SyncRange,
	toCents,
} from "./types";

const BASE = "https://console.neon.tech/api/v2";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.key}` });

// Neon reports usage, not dollars. Rates, allowances and unit conversions
// from https://neon.com/docs/introduction/usage-calculations and
// https://neon.com/pricing, read 2026-10-06. Paid plans have no monthly
// minimum. The Agent plan includes 100 GB of transfer per project
// (https://neon.com/docs/introduction/agent-plan, read 2026-10-06).
const PLANS: Record<
	string,
	{ cuHour: number; freeBranches: number; freeTransferGb: number }
> = {
	launch: { cuHour: 0.106, freeBranches: 9, freeTransferGb: 500 },
	scale: { cuHour: 0.222, freeBranches: 24, freeTransferGb: 500 },
	// ponytail: Agent's included branches aren't published; Scale's are used.
	agent: { cuHour: 0.106, freeBranches: 24, freeTransferGb: 100 },
};
// Business and Enterprise list Scale's rates; negotiated prices aren't visible.
const planOf = (p: string) => PLANS[p] ?? PLANS.scale;

const METRICS: Record<string, string> = {
	compute_unit_seconds: "Compute",
	root_branch_bytes_month: "Root branch storage",
	child_branch_bytes_month: "Child branch storage",
	instant_restore_bytes_month: "Instant restore",
	snapshot_storage_bytes_month: "Snapshots",
	public_network_transfer_bytes: "Public transfer",
	private_network_transfer_bytes: "Private transfer",
	extra_branches_month: "Extra branches",
};

type Consumption = {
	projects: {
		project_id: string;
		periods: {
			period_plan: string;
			consumption: {
				timeframe_start: string;
				timeframe_end: string;
				metrics: { metric_name: string; value: number }[];
			}[];
		}[];
	}[];
	pagination?: { cursor?: string };
};

type Org = { id: string; name: string; plan: string };

// An organization key sees its own organization only; a personal key sees
// every organization the user belongs to.
// https://neon.com/docs/reference/api/users (GET /users/me/organizations, read 2026-10-06)
// https://neon.com/docs/reference/api/organizations (GET /organizations/{org_id}, read 2026-10-06)
async function org(c: Credentials): Promise<Org> {
	const id = c.orgId?.trim();
	if (id)
		return getJson<Org>(`${BASE}/organizations/${id}`, { headers: headers(c) });
	const { organizations: all } = await getJson<{ organizations: Org[] }>(
		`${BASE}/users/me/organizations`,
		{ headers: headers(c) },
	);
	const paid = all.filter((o) => !o.plan.startsWith("free"));
	const pick = all.length === 1 ? all[0] : paid.length === 1 ? paid[0] : null;
	if (!pick)
		throw new ConnectorError(
			all.length
				? "This key sees several organizations. Set the organization id, or use an organization key."
				: "No organization on this key.",
		);
	return pick;
}

// Project names for the mapping page. Deleted projects aren't listed and
// keep showing their id.
// https://api-docs.neon.tech/reference/listprojects (read 2026-10-06)
// Names are only labels, so a failed lookup must not fail the cost sync.
async function projectNames(c: Credentials, orgId: string) {
	const names = new Map<string, string>();
	let cursor = "";
	try {
		for (;;) {
			const r = await getJson<{
				projects: { id: string; name: string }[];
				pagination?: { cursor?: string };
			}>(
				`${BASE}/projects?org_id=${orgId}&limit=400${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
				{ headers: headers(c) },
			);
			for (const p of r.projects ?? []) names.set(p.id, p.name);
			cursor = r.pagination?.cursor ?? "";
			if (!cursor || (r.projects ?? []).length < 400) break;
		}
	} catch {
		// Keep whatever names arrived.
	}
	return names;
}

const monthStart = (d: Date) =>
	new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const nextMonth = (d: Date) =>
	new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));

// Price one page of monthly consumption. Lines are per month, project and
// metric, dated the first of the month.
export function priceConsumption(
	projects: Consumption["projects"],
	now = Date.now(),
): CostLine[] {
	const dollars = new Map<string, number>();
	const transfer = new Map<string, { gb: number; free: number }>();
	const add = (key: string, n: number) =>
		dollars.set(key, (dollars.get(key) ?? 0) + n);
	for (const p of projects) {
		for (const period of p.periods ?? []) {
			const plan = planOf(period.period_plan);
			for (const t of period.consumption ?? []) {
				const month = t.timeframe_start.slice(0, 7);
				const hours =
					(Math.min(Date.parse(t.timeframe_end), now) -
						Date.parse(t.timeframe_start)) /
					3_600_000;
				for (const m of t.metrics ?? []) {
					const key = `${month}:${p.project_id}:${m.metric_name}`;
					const v = m.value ?? 0;
					switch (m.metric_name) {
						case "compute_unit_seconds":
							add(key, (v / 3600) * plan.cuHour);
							break;
						case "root_branch_bytes_month":
						case "child_branch_bytes_month":
							add(key, (v / 1e9) * 0.35);
							break;
						case "instant_restore_bytes_month":
							add(key, (v / 1e9) * 0.2);
							break;
						case "snapshot_storage_bytes_month":
							add(key, (v / 1e9) * 0.09);
							break;
						case "private_network_transfer_bytes":
							add(key, (v / 1e9) * 0.01);
							break;
						case "extra_branches_month": {
							// Branch-hours of every child branch. The plan's allowance
							// (branches per project minus the root) is free for each
							// hour of the bucket; a branch-month is 744 hours at $1.50
							// (https://neon.com/docs/introduction/usage-calculations,
							// read 2026-10-06).
							// ponytail: Neon meters hourly; a monthly bucket nets busy
							// hours against quiet ones, so spiky branch counts price
							// low. Daily buckets reach back only 60 days.
							const billable = Math.max(
								0,
								v - plan.freeBranches * Math.max(0, hours),
							);
							add(key, (billable / 744) * 1.5);
							break;
						}
						case "public_network_transfer_bytes": {
							// The allowance is per project per month, so sum first.
							const t = transfer.get(key) ?? { gb: 0, free: 0 };
							t.gb += v / 1e9;
							t.free = Math.max(t.free, plan.freeTransferGb);
							transfer.set(key, t);
							break;
						}
					}
				}
			}
		}
	}
	for (const [key, t] of transfer) add(key, Math.max(0, t.gb - t.free) * 0.1);

	const out: CostLine[] = [];
	for (const [key, usd] of dollars) {
		const cents = toCents(usd);
		if (!cents) continue;
		const [month, project, metric] = key.split(":");
		out.push({
			externalId: key,
			date: `${month}-01`,
			currency: "USD",
			amountCents: cents,
			service: METRICS[metric] ?? metric,
			subUnitId: project,
		});
	}
	return out;
}

export const neon = register({
	id: "neon",
	name: "Neon",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{
				name: "key",
				label: "Organization API key",
				secret: true,
			},
			{
				name: "orgId",
				label: "Organization id (optional)",
				placeholder: "org-…",
				optional: true,
			},
		],
		createUrl: "https://console.neon.tech/app/settings/api-keys",
		scopes: [
			"Organization API key from your organization's Settings → API keys. Neon has no read-only keys",
		],
	},
	async verify(c) {
		const o = await org(c);
		return { label: o.name };
	},
	// Monthly history reaches back a year, from the first full month.
	historyDays: 330,
	monthly: true,
	async fetchCosts(c, range: SyncRange) {
		const o = await org(c);
		// The Free plan has no bill and no consumption history.
		if (o.plan.startsWith("free")) return [];
		// Monthly granularity reaches back one year, and history starts in
		// March 2024. `to` is exclusive, so end at the next month's start.
		// https://neon.com/docs/guides/consumption-metrics (GET /consumption_history/v2/projects, read 2026-10-06)
		const earliest = Math.max(
			nextMonth(new Date(Date.now() - 365 * 86_400_000)).getTime(),
			Date.UTC(2024, 2, 1),
		);
		const from = new Date(
			Math.max(
				monthStart(new Date(`${range.from}T00:00:00Z`)).getTime(),
				earliest,
			),
		);
		const to = nextMonth(new Date(`${range.to}T00:00:00Z`));
		if (from >= to) return [];
		const projects: Consumption["projects"] = [];
		let cursor: string | undefined;
		for (;;) {
			const url = `${BASE}/consumption_history/v2/projects?org_id=${o.id}&from=${from.toISOString()}&to=${to.toISOString()}&granularity=monthly&metrics=${Object.keys(METRICS).join(",")}&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
			const r = await getJson<Consumption>(url, { headers: headers(c) });
			projects.push(...(r.projects ?? []));
			cursor = r.pagination?.cursor;
			if (!cursor || (r.projects ?? []).length < 100) break;
		}
		const names = await projectNames(c, o.id);
		return priceConsumption(projects).map((l) => ({
			...l,
			subUnitLabel: names.get(l.subUnitId ?? ""),
		}));
	},
});
