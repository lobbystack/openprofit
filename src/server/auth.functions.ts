import { createServerFn } from "@tanstack/react-start";
import { SOCIAL_PROVIDERS } from "#/lib/auth";
import { sessionUser } from "./auth.server";
import { isCloud } from "./billing.server";

export type { SessionUser } from "./auth.server";

export const getSession = createServerFn({ method: "GET" }).handler(() =>
	sessionUser(),
);

export const getAuthOptions = createServerFn({ method: "GET" }).handler(
	async () => ({
		social: SOCIAL_PROVIDERS,
		mailer: Boolean(process.env.RESEND_API_KEY),
		// The terms cover the hosted service only, not self-hosted installs.
		cloud: isCloud,
	}),
);
