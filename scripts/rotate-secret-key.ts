// Re-encrypts every stored secret from OLD_SECRET_KEY to SECRET_KEY: connection
// credentials and the alert channels' Slack and webhook values.
//
//   OLD_SECRET_KEY=<current> SECRET_KEY=<new> SYNC_SCHEDULER=off \
//     DATABASE_URL=<url> bun scripts/rotate-secret-key.ts [--dry-run]
//
// One transaction: a value that neither key opens aborts the whole run and
// nothing is written. Values the new key already opens are left as they are,
// so a second run is safe. Stop the app first (PGlite allows one process),
// then start it with the new SECRET_KEY. Sessions and pending SMS codes are
// signed with the key, so everyone signs in again.
import { eq } from "drizzle-orm";
import { db, schema } from "#/db";
import { decrypt, encrypt, importSecret } from "#/lib/crypto";

const dryRun = process.argv.includes("--dry-run");
if (process.env.OLD_SECRET_KEY === process.env.SECRET_KEY)
	throw new Error("OLD_SECRET_KEY and SECRET_KEY are the same");
const oldKey = await importSecret(process.env.OLD_SECRET_KEY);
const newKey = await importSecret(process.env.SECRET_KEY);

// The value under the new key, or null when it already is.
async function reencrypt(payload: string, where: string) {
	if (await decrypt(payload, newKey).then(() => true, () => false)) return null;
	const value = await decrypt(payload, oldKey).catch(() => {
		throw new Error(`${where}: neither key decrypts it`);
	});
	return encrypt(value, newKey);
}

const counts = { connections: 0, channels: 0, current: 0 };

await db.transaction(async (tx) => {
	const conns = await tx
		.select({
			id: schema.connections.id,
			credentials: schema.connections.credentials,
		})
		.from(schema.connections);
	for (const c of conns) {
		const credentials = await reencrypt(c.credentials, `connection ${c.id}`);
		if (!credentials) {
			counts.current++;
			continue;
		}
		await tx
			.update(schema.connections)
			.set({ credentials })
			.where(eq(schema.connections.id, c.id));
		counts.connections++;
	}

	const channels = await tx.select().from(schema.alertChannels);
	for (const ch of channels) {
		const set: Partial<typeof schema.alertChannels.$inferInsert> = {};
		for (const field of ["slackWebhook", "webhookUrl", "webhookSecret"] as const) {
			const payload = ch[field];
			if (!payload) continue;
			const next = await reencrypt(payload, `${field} of workspace ${ch.workspaceId}`);
			if (next) set[field] = next;
			else counts.current++;
		}
		if (Object.keys(set).length === 0) continue;
		await tx
			.update(schema.alertChannels)
			.set(set)
			.where(eq(schema.alertChannels.workspaceId, ch.workspaceId));
		counts.channels++;
	}

	if (dryRun) tx.rollback();
}).catch((e) => {
	// Drizzle's rollback() throws to end the transaction.
	if (!(dryRun && e?.constructor?.name === "TransactionRollbackError")) throw e;
});

console.log(
	`${dryRun ? "Dry run: would re-encrypt" : "Re-encrypted"} ${counts.connections} connections and ${counts.channels} alert channel rows; ${counts.current} values already used the new key.`,
);
process.exit(0);
