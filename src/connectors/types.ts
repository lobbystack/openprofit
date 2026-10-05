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
	) {
		super(message);
		this.name = "ConnectorError";
	}
}

export async function getJson<T>(
	url: string,
	init: RequestInit & { headers: Record<string, string> },
): Promise<T> {
	const res = await fetch(url, init);
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new ConnectorError(
			`${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ""}`,
			res.status,
		);
	}
	return res.json() as Promise<T>;
}

export const toCents = (n: number) => Math.round(n * 100);
export const dayOf = (unixSeconds: number) =>
	new Date(unixSeconds * 1000).toISOString().slice(0, 10);
