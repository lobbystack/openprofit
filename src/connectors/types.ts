// A connector pulls money lines from one provider. Everything here runs on
// the server with the connection's decrypted credentials.

export type Credentials = Record<string, string>;

export type RevenueLine = {
	externalId: string;
	date: string; // YYYY-MM-DD
	currency: string; // ISO code, upper case
	grossCents: number;
	feesCents: number;
	refundsCents: number;
	netCents: number;
	// Sales tax or VAT the customer paid, whether added on top of the price
	// or included in it. Never part of gross or net. Negative on a refund
	// line for the share of tax returned. Default 0.
	taxCents?: number;
	kind: "subscription" | "one_time" | "other";
	// Provider sub-unit the line belongs to (product id, project id), for
	// mapping to a product.
	subUnitId?: string;
	subUnitLabel?: string;
};

export type CostLine = {
	externalId: string;
	date: string;
	currency: string;
	amountCents: number;
	service?: string;
	subUnitId?: string;
	subUnitLabel?: string;
};

export type Snapshot = {
	date: string;
	metric: "mrr_base_cents" | "customers";
	value: number;
	currency?: string;
};

export type SyncRange = { from: string; to: string };

export type KeyField = {
	name: string;
	label: string;
	placeholder?: string;
	secret?: boolean;
	optional?: boolean;
	// Renders a select. The first option is the default.
	options?: { value: string; label: string }[];
};

export type Connector = {
	id: string;
	name: string;
	kind: "revenue" | "cost";
	auth: {
		kind: "key";
		fields: KeyField[];
		// Where the user creates the key, and what to tick there.
		createUrl: string;
		scopes: string[];
	};
	// How many days back a fetch returns complete results. Sync deletes stored
	// lines the fetch no longer returns only within this window (and the sync
	// range). Unset: the whole range is complete. 0: never delete.
	historyDays?: number;
	// The provider files and pays the tax it collects (merchant of record,
	// app stores). Unset: the seller owes the tax on their own lines.
	remitsTax?: boolean;
	// Prove the credentials work. Returns a label for the connection.
	verify(creds: Credentials): Promise<{ label: string }>;
	fetchRevenue?(creds: Credentials, range: SyncRange): Promise<RevenueLine[]>;
	fetchCosts?(creds: Credentials, range: SyncRange): Promise<CostLine[]>;
	fetchSnapshots?(creds: Credentials, date: string): Promise<Snapshot[]>;
};

export class ConnectorError extends Error {
	constructor(
		message: string,
		public status?: number,
		// The provider rejected the credentials (401, or 403 that is not a
		// rate limit). Sync stops retrying these on its own.
		public auth = false,
	) {
		super(message);
		this.name = "ConnectorError";
	}
}

export async function getJson<T>(
	url: string,
	init: RequestInit & { headers: Record<string, string> },
): Promise<T> {
	let res = await fetch(url, init);
	// Rate limited: wait as long as Retry-After (seconds) says, else 5s
	// doubling, each wait capped at 30s, up to 4 retries. GitHub signals
	// secondary limits as a 403 with retry-after.
	const limited = (r: Response) =>
		r.status === 429 || (r.status === 403 && r.headers.has("retry-after"));
	for (let i = 0; i < 4 && limited(res); i++) {
		const wait = Number(res.headers.get("retry-after")) || 2 ** i * 5;
		await new Promise((r) => setTimeout(r, Math.min(wait, 30) * 1000));
		res = await fetch(url, init);
	}
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new ConnectorError(
			`${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ""}`,
			res.status,
			res.status === 401 ||
				(res.status === 403 && !res.headers.has("retry-after")),
		);
	}
	return res.json() as Promise<T>;
}

export const toCents = (n: number) => Math.round(n * 100);
export const dayOf = (unixSeconds: number) =>
	new Date(unixSeconds * 1000).toISOString().slice(0, 10);

// Split cents by weights so the parts add up to the total exactly (largest
// remainder).
export function splitCents(total: number, weights: number[]) {
	const sum = weights.reduce((a, b) => a + b, 0);
	const exact = weights.map((w) => (total * w) / sum);
	const parts = exact.map(Math.floor);
	let left = total - parts.reduce((a, b) => a + b, 0);
	const order = exact
		.map((x, i) => [x - Math.floor(x), i])
		.sort((a, b) => b[0] - a[0]);
	for (const [, i] of order) {
		if (left-- <= 0) break;
		parts[i]++;
	}
	return parts;
}

// Split a fee across sub-units by their usage. With no usage at all, the
// whole fee goes to "" (the connection itself). Zero parts are left out.
export function splitByUsage(
	total: number,
	usage: Map<string, number>,
): [string, number][] {
	const used = [...usage].filter(([, n]) => n > 0);
	if (!used.length) return total ? [["", total]] : [];
	const parts = splitCents(
		total,
		used.map(([, n]) => n),
	);
	return used
		.map(([name], i): [string, number] => [name, parts[i]])
		.filter(([, cents]) => cents !== 0);
}

// MRR snapshots, one per currency (sync converts each to base and adds
// them up), and the customer count.
export function mrrSnapshots(
	date: string,
	byCurrency: Map<string, number>,
	customers: number,
): Snapshot[] {
	const out: Snapshot[] = [...byCurrency].map(([currency, mrr]) => ({
		date,
		metric: "mrr_base_cents",
		value: Math.round(mrr),
		currency,
	}));
	if (!out.length)
		out.push({ date, metric: "mrr_base_cents", value: 0, currency: "USD" });
	out.push({ date, metric: "customers", value: customers });
	return out;
}
