import "#/server/env";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { db } from "#/db";
import * as authSchema from "#/db/auth-schema";
import { capture } from "#/server/analytics.server";
import { sendEmail } from "#/server/email.server";
import { APP_NAME } from "./app";

const url = process.env.APP_URL ?? "http://localhost:3000";

const social: Record<string, { clientId: string; clientSecret: string }> = {};
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
	social.github = {
		clientId: process.env.GITHUB_CLIENT_ID,
		clientSecret: process.env.GITHUB_CLIENT_SECRET,
	};
}
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
	social.google = {
		clientId: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	};
}

export const SOCIAL_PROVIDERS = Object.keys(social);

export const auth = betterAuth({
	appName: APP_NAME,
	baseURL: url,
	secret: process.env.SECRET_KEY,
	database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
	socialProviders: social,
	user: {
		// Product analytics, on until the user switches it off in Settings.
		additionalFields: {
			analytics: { type: "boolean", defaultValue: true, input: false },
		},
	},
	databaseHooks: {
		user: {
			create: {
				after: async (user, ctx) => {
					// Social sign-in returns through /callback/:provider.
					const social = ctx?.path?.startsWith("/callback/");
					await capture(user.id, null, "user_signed_up", {
						method: social ? ctx?.params?.id : "email",
					});
				},
			},
		},
	},
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, url }) =>
				sendEmail(
					email,
					`Sign in to ${APP_NAME}`,
					`Open this link to sign in:\n\n${url}\n\nIt expires in 5 minutes.`,
				),
		}),
	],
});

export type Session = typeof auth.$Infer.Session;
