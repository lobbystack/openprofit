import type { PostHog } from "posthog-js";

// PostHog in the browser: web analytics and session replay. Product events
// are captured on the server (src/server/analytics.server.ts).
//
// PostHog never stores anything on the device. Each page load picks one of
// two setups, and the choice holds until the next load:
// - A signed-in user with the Analytics switch on (user.analytics, the
//   default): memory persistence, started with their user id and workspace
//   group, and replay while the page is in the app. A full reload starts a
//   new session.
// - Everyone else: cookieless mode, which counts visitors with a daily hash
//   on PostHog's servers.
// When the switch or the signed-in user calls for the other setup, the page
// reloads.

export type AnalyticsConfig = {
	// Project token, or null when POSTHOG_KEY is unset (self-host default).
	key: string | null;
	apiHost: string;
	uiHost: string;
};

type Who = { user: string; workspace?: string; plan?: string; on: boolean };

let ph: Promise<PostHog> | null = null;
// The user this page's PostHog was started for, or null for cookieless.
let started: string | null = null;
let who: Who | null = null;

const inApp = (path = location.pathname) =>
	/^\/(app|onboarding)(\/|$)/.test(path);

// Replay never shows digits, and inside the app it shows no text at all:
// amounts, names and emails are all masked.
const mask = (text: string) =>
	inApp() ? text.replace(/\S/g, "*") : text.replace(/\d/g, "*");

const record = (p: PostHog, path?: string) =>
	started && inApp(path) ? p.startSessionRecording() : p.stopSessionRecording();

const group = (p: PostHog) => {
	if (who?.workspace)
		p.group("workspace", who.workspace, who.plan ? { plan: who.plan } : {});
};

// PostHog's keys: ph_<token>_* and __ph_opt_in_out_<token>.
const posthogKey = (k: string) => /^(__)?ph_/.test(k);

// ponytail: deletes what the cookie banner (October 2026) left in browsers
// that accepted it. Drop it in 2027.
function clearOldStorage() {
	for (const c of document.cookie.split("; ")) {
		const name = c.split("=")[0];
		if (name === "op_consent" || posthogKey(name))
			// PostHog's defaults set its cookie on the parent domain, so delete
			// it there too as well as host-only.
			for (const domain of [
				"",
				`; Domain=${location.hostname}`,
				`; Domain=.${location.hostname}`,
			])
				// biome-ignore lint/suspicious/noDocumentCookie: deleting cookies by name
				document.cookie = `${name}=; Path=/; Max-Age=0${domain}`;
	}
	for (const k of Object.keys(localStorage))
		if (posthogKey(k)) localStorage.removeItem(k);
}

let cfg: AnalyticsConfig | null = null;

// Once per page load, from the root route. On app pages PostHog waits for
// identify() to say whose page it is.
export function initAnalytics(config: AnalyticsConfig) {
	if (!config.key || cfg) return;
	cfg = config;
	clearOldStorage();
	if (who || !inApp()) start();
}

function start() {
	if (!cfg?.key || ph) return;
	const key = cfg.key;
	const { apiHost, uiHost } = cfg;
	started = who?.on ? who.user : null;
	const user = started;
	ph = import("posthog-js").then(({ default: posthog }) => {
		posthog.init(key, {
			api_host: apiHost,
			ui_host: uiHost,
			defaults: "2026-08-30",
			person_profiles: "identified_only",
			...(user
				? {
						persistence: "memory" as const,
						bootstrap: { distinctID: user, isIdentifiedID: true },
					}
				: { cookieless_mode: "always" as const }),
			// Replay runs only on app pages; record() starts and stops it.
			disable_session_recording: true,
			capture_exceptions: true,
			// Autocapture records which element was clicked, not its text.
			mask_all_text: true,
			disable_surveys: true,
			// Console output can hold amounts or error details.
			enable_recording_console_log: false,
			session_recording: {
				maskAllInputs: true,
				maskTextSelector: "*",
				maskTextFn: mask,
				// Server function responses carry amounts: keep timings only.
				maskCapturedNetworkRequestFn: (r) => ({
					...r,
					name: r.name.split("?")[0],
					requestBody: null,
					responseBody: null,
				}),
			},
		});
		if (user) group(posthog);
		record(posthog);
		return posthog;
	});
}

// From the root route, before each navigation renders the next page.
export function onNavigate(path: string) {
	void ph?.then((p) => record(p, path));
}

// From the app and onboarding: user id only, no email. The workspace is a
// PostHog group. `on` is the user's Analytics switch.
export function identify(
	user: string,
	on: boolean,
	workspace?: string,
	plan?: string,
) {
	who = { user, on, workspace, plan };
	if (!ph) return start();
	// The page started cookieless (a public page, then an in-app link into
	// /app) or the switch changed: PostHog can't change mode on a running
	// page, so reload once into the right one. Accepted cost.
	if (started !== (on ? user : null)) return location.reload();
	if (started) void ph.then(group);
}
