import "#/server/env";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as authSchema from "./auth-schema";
import * as appSchema from "./schema";

// SQLite through libsql. `file:` for self-host and local dev; a libsql URL
// plus DATABASE_AUTH_TOKEN for hosted databases.
const url = process.env.DATABASE_URL ?? "file:./data/openprofit.db";

const client = createClient({
	url,
	authToken: process.env.DATABASE_AUTH_TOKEN,
});

const schema = { ...appSchema, ...authSchema };

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { appSchema as schema, authSchema };
