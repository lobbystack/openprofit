// Config used only to generate the auth tables. The real instance is src/lib/auth.ts.
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { db } from "#/db";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "pg" }),
	plugins: [magicLink({ sendMagicLink: async () => {} })],
});
