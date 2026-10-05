import "#/server/env";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { db } from "#/db";
import * as authSchema from "#/db/auth-schema";
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

async function sendMagicLink(email: string, link: string) {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		// No email provider configured: print the link. This is how self-host
		// and local dev sign in.
		console.log(`\n[${APP_NAME}] Sign-in link for ${email}\n${link}\n`);
		return;
	}
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${key}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: process.env.EMAIL_FROM ?? `${APP_NAME} <login@example.com>`,
			to: email,
			subject: `Sign in to ${APP_NAME}`,
			text: `Open this link to sign in:\n\n${link}\n\nIt expires in 5 minutes.`,
		}),
	});
	if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export const auth = betterAuth({
	appName: APP_NAME,
	baseURL: url,
	secret: process.env.SECRET_KEY,
	database: drizzleAdapter(db, { provider: "sqlite", schema: authSchema }),
	socialProviders: social,
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, url }) => sendMagicLink(email, url),
		}),
	],
});

export type Session = typeof auth.$Infer.Session;
