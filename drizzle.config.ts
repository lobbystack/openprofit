import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "./data/openprofit";
const server = /^postgres(ql)?:\/\//.test(url);

export default defineConfig({
	dialect: "postgresql",
	schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
	out: "./drizzle",
	...(server ? {} : { driver: "pglite" }),
	dbCredentials: { url },
});
