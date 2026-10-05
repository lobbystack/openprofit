import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "#/db";
import pkg from "../../package.json";
import "./env";

const URL = process.env.TELEMETRY_URL ?? "https://openprofit.dev/api/telemetry";

// One anonymous ping a day: version and counts, no names or amounts. The
// instance id is a hash of the secret key, so it is stable and not reversible.
export async function sendTelemetry() {
	const on = await db.query.workspaces.findFirst({
		where: eq(schema.workspaces.telemetry, true),
	});
	if (!on) return;
	const [[w], [pr], byProvider] = await Promise.all([
		db.select({ n: sql<number>`count(*)` }).from(schema.workspaces),
		db.select({ n: sql<number>`count(*)` }).from(schema.products),
		db
			.select({
				provider: schema.connections.provider,
				n: sql<number>`count(*)`,
			})
			.from(schema.connections)
			.groupBy(schema.connections.provider),
	]);
	const body = {
		instance: createHash("sha256")
			.update(process.env.SECRET_KEY ?? "")
			.digest("hex")
			.slice(0, 16),
		version: pkg.version,
		workspaces: Number(w?.n ?? 0),
		products: Number(pr?.n ?? 0),
		connections: Object.fromEntries(
			byProvider.map((r) => [r.provider, Number(r.n)]),
		),
	};
	await fetch(URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	}).catch(() => {});
}

export async function recordTelemetry(body: unknown) {
	const b = body as { instance?: string; version?: string };
	if (typeof b?.instance !== "string" || typeof b?.version !== "string")
		return false;
	await db.insert(schema.telemetryPings).values({
		instance: b.instance.slice(0, 64),
		version: b.version.slice(0, 32),
		payload: JSON.stringify(body).slice(0, 4000),
		seenAt: Date.now(),
	});
	return true;
}
