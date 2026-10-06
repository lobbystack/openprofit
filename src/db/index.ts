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

const pgDb = isPostgresServer
	? drizzlePg(new Pool({ connectionString: DATABASE_URL }), { schema })
	: null;
const pgliteDb = pgDb
	? null
	: drizzlePglite(new PGlite(DATABASE_URL), { schema });

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
