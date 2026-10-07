import { register } from "./registry";
import {
	ConnectorError,
	type CostLine,
	type Credentials,
	toCents,
} from "./types";

const API = "https://backboard.railway.com/graphql/v2";

// Railway reports resource units, not dollars. Published prices, per
// minute for the metered ones (43,200 minutes a month, as Railway's CLI
// converts).
const PRICE: Record<string, { perUnit: number; label: string }> = {
	CPU_USAGE: { perUnit: 20 / 43_200, label: "CPU" },
	MEMORY_USAGE_GB: { perUnit: 10 / 43_200, label: "Memory" },
	NETWORK_TX_GB: { perUnit: 0.05, label: "Egress" },
	DISK_USAGE_GB: { perUnit: 0.15 / 43_200, label: "Disk" },
	BACKUP_USAGE_GB: { perUnit: 0.15 / 43_200, label: "Backups" },
};

type Usage = {
	measurement: string;
	value: number;
	tags: { projectId: string | null };
};

async function gql<T>(c: Credentials, query: string, variables: object) {
	const res = await fetch(API, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${c.token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ query, variables }),
	});
	const json = (await res.json().catch(() => ({}))) as {
		data?: T;
		errors?: { message: string }[];
	};
	if (!res.ok || json.errors?.length)
		throw new ConnectorError(
			json.errors?.[0]?.message ?? `${res.status}`,
			res.status,
		);
	return json.data as T;
}

async function workspaceId(c: Credentials) {
	if (c.workspaceId?.trim()) return c.workspaceId.trim();
	const me = await gql<{ me: { workspaces: { id: string }[] } }>(
		c,
		"query { me { workspaces { id name } } }",
		{},
	);
	const ws = me.me.workspaces[0];
	if (!ws)
		throw new ConnectorError("No workspace on this token. Set a workspace id.");
	return ws.id;
}

// Project names for the mapping page, from Railway's documented query:
// https://docs.railway.com/integrations/api/manage-projects
// Deleted projects aren't listed and keep showing their id. Names are only
// labels, so a failed lookup must not fail the cost sync.
async function projectNames(c: Credentials, workspaceId: string) {
	const r = await gql<{
		projects: { edges: { node: { id: string; name: string } }[] };
	}>(
		c,
		"query ($id: String!) { projects(workspaceId: $id) { edges { node { id name } } } }",
		{ id: workspaceId },
	).catch(() => null);
	return new Map(r?.projects.edges.map((e) => [e.node.id, e.node.name]));
}

const monthsBetween = (from: string, to: string) => {
	const out: string[] = [];
	let d = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
	const end = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
	while (d <= end) {
		out.push(d.toISOString().slice(0, 7));
		d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
	}
	return out;
};

export const railway = register({
	id: "railway",
	name: "Railway",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{
				name: "token",
				label: "Account or workspace token",
				placeholder: "…",
				secret: true,
			},
			{
				name: "workspaceId",
				label: "Workspace id (optional with an account token)",
				placeholder: "…",
				optional: true,
			},
		],
		createUrl: "https://railway.com/account/tokens",
		scopes: ["Account token, or a workspace token for the workspace to read"],
	},
	async verify(c) {
		const id = await workspaceId(c);
		const r = await gql<{ workspace: { name: string } }>(
			c,
			"query ($id: String!) { workspace(workspaceId: $id) { name } }",
			{ id },
		);
		return { label: r.workspace.name };
	},
	// One line per project, measurement and month. Usage is aggregated over
	// the range, so months are the finest grain without a query per day.
	async fetchCosts(c, range) {
		const id = await workspaceId(c);
		const names = await projectNames(c, id);
		const out: CostLine[] = [];
		for (const month of monthsBetween(range.from, range.to)) {
			const start = `${month}-01T00:00:00.000Z`;
			const [y, m] = month.split("-").map(Number);
			const end = new Date(Date.UTC(y, m, 1)).toISOString();
			const r = await gql<{ usage: Usage[] }>(
				c,
				`query ($id: String!, $start: DateTime, $end: DateTime) {
					usage(workspaceId: $id, startDate: $start, endDate: $end, includeDeleted: true,
						measurements: [CPU_USAGE, MEMORY_USAGE_GB, NETWORK_TX_GB, DISK_USAGE_GB, BACKUP_USAGE_GB],
						groupBy: [PROJECT_ID]) { measurement value tags { projectId } }
				}`,
				{ id, start, end },
			);
			for (const u of r.usage) {
				const price = PRICE[u.measurement];
				if (!price || !u.value) continue;
				const dollars = u.value * price.perUnit;
				if (dollars < 0.005) continue;
				out.push({
					externalId: `${month}:${u.tags.projectId ?? "none"}:${u.measurement}`,
					date: `${month}-01`,
					currency: "USD",
					amountCents: toCents(dollars),
					service: price.label,
					subUnitId: u.tags.projectId ?? undefined,
					subUnitLabel: names.get(u.tags.projectId ?? ""),
				});
			}
		}
		return out;
	},
});
