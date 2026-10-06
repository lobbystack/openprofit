import type { Connector } from "./types";

// Populated by each connector module, in import order. The connections page
// orders providers by PROVIDERS in components/provider-logo.tsx instead.
const registry = new Map<string, Connector>();

export function register(c: Connector) {
	registry.set(c.id, c);
	return c;
}

export function connector(id: string): Connector {
	const c = registry.get(id);
	if (!c) throw new Error(`Unknown connector: ${id}`);
	return c;
}

export function connectors() {
	return [...registry.values()];
}

// Client-safe description of how to connect, without the implementation.
export type ConnectorInfo = {
	id: string;
	name: string;
	kind: "revenue" | "cost";
	fields: Connector["auth"]["fields"];
	createUrl: string;
	scopes: string[];
};

export function connectorInfo(c: Connector): ConnectorInfo {
	return {
		id: c.id,
		name: c.name,
		kind: c.kind,
		fields: c.auth.fields,
		createUrl: c.auth.createUrl,
		scopes: c.auth.scopes,
	};
}
