import type { PostHog } from "posthog-js";

// PostHog in the browser: web analytics and session replay. Product events
// are captured on the server (src/server/analytics.server.ts).
//
// PostHog loads on every page in cookieless mode: it stores nothing on the
// device and counts visitors with a daily hash on its servers. The one way
// out is a signed-in user's Analytics switch in Settings (user.analytics,
// on by default). While it is on, the app opts PostHog in, which lets it use
// its cookies and storage, links the browser to the user and workspace, and
// records replays on app pages only. Off, or signed out, goes back to
// cookieless and deletes what PostHog stored.

export type AnalyticsConfig = {
	// Project token, or null when POSTHOG_KEY is unset (self-host default).
	key: string | null;
	apiHost: string;
	uiHost: string;
};

type Who = { user: string; workspace?: string; plan?: string; on: boolean };

let ph: Promise<PostHog> | null = null;
let who: Who | null = null;

const inApp = (path = location.pathname) =>
	/^\/(app|onboarding)(\/|$)/.test(path);

// Replay never shows digits, and inside the app it shows no text at all:
// amounts, names and emails are all masked.
const mask = (text: string) =>
	inApp() ? text.replace(/\S/g, "*") : text.replace(/\d/g, "*");

// Back to cookieless: stops replay, deletes PostHog's cookies and local
// storage, then its consent record. Tab ids stay in session storage, so
// clear those too.
function forget(p: PostHog) {
	p.opt_out_capturing();
	p.clear_opt_in_out_capturing();
	for (const k of Object.keys(sessionStorage))
		if (k.startsWith("ph_")) sessionStorage.removeItem(k);
}

const record = (p: PostHog, path?: string) =>
	who?.on && inApp(path) ? p.startSessionRecording() : p.stopSessionRecording();

// Follows the user's switch, then the current page.
function apply(p: PostHog) {
	const granted = p.get_explicit_consent_status() === "granted";
	if (who?.on) {
		if (!granted) p.opt_in_capturing({ captureEventName: false });
		p.identify(who.user);
		if (who.workspace)
			p.group("workspace", who.workspace, who.plan ? { plan: who.plan } : {});
	} else if (who && granted) forget(p);
	record(p);
}

// ponytail: deletes what the cookie banner (October 2026) left in browsers
// that accepted it. Drop it in 2027.
function clearBanner() {
	if (!/(?:^|; )op_consent=/.test(document.cookie)) return;
	for (const c of document.cookie.split("; ")) {
		const name = c.split("=")[0];
		if (name === "op_consent" || name.startsWith("ph_"))
			// biome-ignore lint/suspicious/noDocumentCookie: deleting cookies by name
			document.cookie = `${name}=; Path=/; Max-Age=0`;
	}
	for (const k of Object.keys(localStorage))
		if (k.startsWith("ph_")) localStorage.removeItem(k);
}

// Once per page load, from the root route.
export function initAnalytics(cfg: AnalyticsConfig) {
	if (!cfg.key || ph) return;
	const key = cfg.key;
	clearBanner();
	ph = import("posthog-js").then(({ default: posthog }) => {
		posthog.init(key, {
			api_host: cfg.apiHost,
			ui_host: cfg.uiHost,
			defaults: "2026-08-30",
			person_profiles: "identified_only",
			// Cookieless unless a signed-in user's Analytics switch opts in.
			cookieless_mode: "on_reject",
			opt_out_capturing_by_default: true,
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
		apply(posthog);
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
	void ph?.then(apply);
}

// On sign-out: back to cookieless.
export function resetAnalytics() {
	who = null;
	void ph?.then((p) => {
		if (p.get_explicit_consent_status() === "granted") forget(p);
	});
}
