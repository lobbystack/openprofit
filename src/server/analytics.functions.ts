import { createServerFn } from "@tanstack/react-start";
import type { AnalyticsConfig } from "#/lib/analytics";

// What the browser needs to start PostHog.
export const getAnalyticsConfig = createServerFn({ method: "GET" }).handler(
	(): AnalyticsConfig => ({
		key: process.env.POSTHOG_KEY || null,
		// PostHog's managed proxy on our own subdomain, else the /ingest route.
		apiHost: process.env.POSTHOG_PROXY || "/ingest",
		// The app's address for the toolbar: us.i.posthog.com -> us.posthog.com.
		uiHost: (process.env.POSTHOG_HOST ?? "https://us.i.posthog.com").replace(
			".i.posthog.com",
			".posthog.com",
		),
	}),
);
