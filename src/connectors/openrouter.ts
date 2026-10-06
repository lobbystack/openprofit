import { register } from "./registry";
import { type CostLine, type Credentials, getJson, toCents } from "./types";

const BASE = "https://openrouter.ai/api/v1";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.key}` });

type Row = { date: string; model: string; usage: number };
type Key = { hash: string; name: string; label: string; usage: number };

// Sum usage per day and model. `usage` is OpenRouter credits in USD;
// byok_usage_inference is billed by the user's own provider account, so it
// stays out (that provider's connector counts it).
const byDayModel = (rows: Row[]) => {
	const m = new Map<string, Row>();
	for (const r of rows) {
		const k = `${r.date}:${r.model}`;
		const s = m.get(k) ?? { date: r.date, model: r.model, usage: 0 };
		s.usage += r.usage;
		m.set(k, s);
	}
	return m;
};

// One line per day, model and API key. `perKey` holds each key's rows;
// whatever the account total has beyond them (keys in other workspaces,
// deleted keys) becomes a line without a key.
export function activityLines(
	total: Row[],
	perKey: { key: Key; rows: Row[] }[],
): CostLine[] {
	const out: CostLine[] = [];
	const rest = byDayModel(total);
	for (const { key, rows } of perKey) {
		for (const [k, r] of byDayModel(rows)) {
			const left = rest.get(k);
			if (left) left.usage -= r.usage;
			const cents = toCents(r.usage);
			if (!cents) continue;
			out.push({
				externalId: `${k}:${key.hash}`,
				date: r.date,
				currency: "USD",
				amountCents: cents,
				service: r.model,
				subUnitId: key.hash,
				subUnitLabel: `${key.name} (${key.label})`,
			});
		}
	}
	for (const [k, r] of rest) {
		const cents = toCents(r.usage);
		if (cents <= 0) continue;
		out.push({
			externalId: `${k}:none`,
			date: r.date,
			currency: "USD",
			amountCents: cents,
			service: r.model,
		});
	}
	return out;
}

// https://openrouter.ai/docs/api/api-reference/analytics/get-user-activity
const activity = async (c: Credentials, query = "") =>
	(
		await getJson<{ data: Row[] }>(`${BASE}/activity${query}`, {
			headers: headers(c),
		})
	).data;

export const openrouter = register({
	id: "openrouter",
	name: "OpenRouter",
	kind: "cost",
	auth: {
		kind: "key",
		fields: [
			{
				name: "key",
				label: "Management key",
				placeholder: "sk-or-v1-…",
				secret: true,
			},
		],
		createUrl: "https://openrouter.ai/settings/management-keys",
		scopes: [
			"Management key. OpenRouter offers no read-only key for activity data.",
			"The key can create and delete API keys. OpenProfit only reads activity and the key list.",
		],
	},
	async verify(c) {
		// https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key
		const me = await getJson<{ data: { label: string } }>(`${BASE}/key`, {
			headers: headers(c),
		});
		await activity(c);
		return { label: me.data.label };
	},
	// The API covers the last 30 completed UTC days and ignores the range:
	// every sync rereads all 30, so late corrections replace earlier figures.
	async fetchCosts(c) {
		const keys: Key[] = [];
		const seen = new Set<string>();
		for (;;) {
			// https://openrouter.ai/docs/api/api-reference/api-keys/list-api-keys
			const page = await getJson<{ data: Key[] }>(
				`${BASE}/keys?include_disabled=true&offset=${keys.length}`,
				{ headers: headers(c) },
			);
			const fresh = page.data.filter((k) => !seen.has(k.hash));
			if (!fresh.length) break;
			for (const k of fresh) seen.add(k.hash);
			keys.push(...fresh);
		}
		const total = await activity(c);
		const perKey: { key: Key; rows: Row[] }[] = [];
		// ponytail: one request per key that has ever spent credits. Fine for
		// tens of keys; with hundreds, map workspaces (group_by=workspace).
		for (const key of keys) {
			if (!key.usage) continue;
			perKey.push({
				key,
				rows: await activity(c, `?api_key_hash=${key.hash}`),
			});
		}
		return activityLines(total, perKey);
	},
});
