import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { type AnalyticsConfig, CONSENT_COOKIE } from "#/lib/analytics";
import "./env";

// What the browser needs to start PostHog, and the visitor's saved choice.
export const getAnalyticsConfig = createServerFn({ method: "GET" }).handler(
	(): AnalyticsConfig => {
		const consent = getCookie(CONSENT_COOKIE);
		return {
			key: process.env.POSTHOG_KEY || null,
			// PostHog's managed proxy on our own subdomain, else the /ingest route.
			apiHost: process.env.POSTHOG_PROXY || "/ingest",
			// The app's address for the toolbar: us.i.posthog.com -> us.posthog.com.
			uiHost: (process.env.POSTHOG_HOST ?? "https://us.i.posthog.com").replace(
				".i.posthog.com",
				".posthog.com",
			),
			consent: consent === "yes" || consent === "no" ? consent : null,
		};
	},
);
