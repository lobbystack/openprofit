import "@tanstack/react-start/server-only";
import "#/server/env";
import { PGlite } from "@electric-sql/pglite";
import {
	drizzle as drizzlePg,
	type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";
import * as authSchema from "./auth-schema";
import * as appSchema from "./schema";

// A `postgres://` URL uses a Postgres server. Anything else is a directory
// for PGlite, Postgres running in-process, so self-host needs no database
// service.
export const DATABASE_URL = process.env.DATABASE_URL ?? "./data/openprofit";
export const isPostgresServer = /^postgres(ql)?:\/\//.test(DATABASE_URL);

const schema = { ...appSchema, ...authSchema };

const pool = isPostgresServer
	? new Pool({ connectionString: DATABASE_URL })
	: null;
const pglite = pool ? null : new PGlite(DATABASE_URL);
const pgDb = pool ? drizzlePg(pool, { schema }) : null;
const pgliteDb = pglite ? drizzlePglite(pglite, { schema }) : null;

export const db: NodePgDatabase<typeof schema> =
	pgDb ?? (pgliteDb as unknown as NodePgDatabase<typeof schema>);
export type Db = typeof db;

// Migrations in ./drizzle run once at start. `pnpm db:generate` writes a
// new one after a schema change.
if (process.env.SKIP_MIGRATIONS !== "1") {
	const opts = { migrationsFolder: "drizzle" };
	if (pgDb) await migratePg(pgDb, opts);
	else if (pgliteDb) await migratePglite(pgliteDb, opts);
}
export { appSchema as schema, authSchema };

// On SIGTERM (docker stop, a deploy) or SIGINT, close the database, then
// exit. Nitro stops the HTTP server and waits for the event loop to empty,
// but PGlite keeps a timer running, so without this the process never ends
// and Docker kills it 10 seconds later, possibly mid-write. Once per
// process: Vite can evaluate this module again in development.
declare global {
	var __openprofitDbClose: boolean | undefined;
}
if (!globalThis.__openprofitDbClose) {
	globalThis.__openprofitDbClose = true;
	const close = () => {
		// A query that never finishes can't hold the exit forever.
		setTimeout(() => process.exit(0), 5000).unref();
		void (pglite ? pglite.close() : pool?.end())
			?.catch((err) => console.error("[db] close", err))
			.finally(() => process.exit(0));
	};
	process.once("SIGTERM", close);
	process.once("SIGINT", close);
}
