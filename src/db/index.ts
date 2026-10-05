import "#/server/env";
import { PGlite } from "@electric-sql/pglite";
import {
	drizzle as drizzlePg,
	type NodePgDatabase,
} from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";
import * as authSchema from "./auth-schema";
import * as appSchema from "./schema";

// A `postgres://` URL uses a Postgres server. Anything else is a directory
// for PGlite, Postgres running in-process, so self-host needs no database
// service.
export const DATABASE_URL = process.env.DATABASE_URL ?? "./data/openprofit";
export const isPostgresServer = /^postgres(ql)?:\/\//.test(DATABASE_URL);

const schema = { ...appSchema, ...authSchema };

export const db: NodePgDatabase<typeof schema> = isPostgresServer
	? drizzlePg(new Pool({ connectionString: DATABASE_URL }), { schema })
	: (drizzlePglite(new PGlite(DATABASE_URL), {
			schema,
		}) as unknown as NodePgDatabase<typeof schema>);
export type Db = typeof db;
export { appSchema as schema, authSchema };
