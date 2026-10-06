import type { PostHog } from "posthog-js";

// PostHog in the browser: web analytics and session replay. Product events
// are captured on the server (src/server/analytics.server.ts).
//
// PostHog loads on every page. Until the visitor accepts in the cookie
// banner, and after they decline, it runs in cookieless mode: it stores
// nothing on the device, PostHog counts visitors with a daily hash on its
// servers, and replay is off. Accepting turns on its cookies and replay.
//
// The choice lives in the op_consent cookie. The server reads it to render
// the banner without a flash, and PostHog reads it as its consent record.

export const CONSENT_COOKIE = "op_consent";
export type Consent = "yes" | "no" | null;
export type AnalyticsConfig = {
	// Project token, or null when POSTHOG_KEY is unset (self-host default).
	key: string | null;
	apiHost: string;
	uiHost: string;
	consent: Consent;
};

let ph: Promise<PostHog> | null = null;
let who: { user: string; workspace?: string; plan?: string } | null = null;

// Replay never shows digits, and inside the app it shows no text at all:
// amounts, names and emails are all masked.
const mask = (text: string) =>
	/^\/(app|onboarding)(\/|$)/.test(location.pathname)
		? text.replace(/\S/g, "*")
		: text.replace(/\d/g, "*");

// PostHog may store 1 or 0 in the same cookie; read them as yes and no.
export const parseConsent = (v?: string | null): Consent =>
	v === "yes" || v === "1" ? "yes" : v === "no" || v === "0" ? "no" : null;

export function readConsent(): Consent {
	return parseConsent(document.cookie.match(/(?:^|; )op_consent=([^;]*)/)?.[1]);
}

function remember(yes: boolean) {
	const secure = location.protocol === "https:" ? "; Secure" : "";
	// biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is missing in some browsers
	document.cookie = `${CONSENT_COOKIE}=${yes ? "yes" : "no"}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;
}

const consented = (p: PostHog) => p.get_explicit_consent_status() === "granted";

// Links this browser to the user id and workspace, only after consent.
function apply(p: PostHog) {
	if (!who || !consented(p)) return;
	p.identify(who.user);
	if (who.workspace)
		p.group("workspace", who.workspace, who.plan ? { plan: who.plan } : {});
}

// Once per page load, from the root route.
export function initAnalytics(cfg: AnalyticsConfig) {
	if (!cfg.key || ph) return;
	const key = cfg.key;
	ph = import("posthog-js").then(({ default: posthog }) => {
		posthog.init(key, {
			api_host: cfg.apiHost,
			ui_host: cfg.uiHost,
			defaults: "2026-08-30",
			person_profiles: "identified_only",
			// Cookieless until the visitor accepts. With no choice yet the
			// default is opted out, which on_reject turns into cookieless.
			cookieless_mode: "on_reject",
			opt_out_capturing_by_default: true,
			// PostHog reads yes and no from the banner's cookie instead of
			// keeping its own record. Host-only, like op_consent, so PostHog's
			// writes replace that cookie instead of adding a second one.
			consent_persistence_name: CONSENT_COOKIE,
			opt_out_capturing_persistence_type: "cookie",
			cross_subdomain_cookie: false,
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

// The banner and the Settings row both land here; takes effect at once.
export function setConsent(yes: boolean) {
	const done = () => {
		remember(yes);
		window.dispatchEvent(new CustomEvent("op:consent", { detail: yes }));
	};
	// Saved before PostHog loads, so closing the tab can't lose the choice.
	remember(yes);
	if (!ph) return done();
	void ph.then((p) => {
		// Accepting switches to cookies and starts replay; declining stops
		// replay, deletes PostHog's cookies and local storage and goes back to
		// cookieless. Its tab ids stay in session storage, so clear those too.
		if (yes) p.opt_in_capturing({ captureEventName: false });
		else {
			p.opt_out_capturing();
			for (const k of Object.keys(sessionStorage))
				if (k.startsWith("ph_")) sessionStorage.removeItem(k);
		}
		// Both store 1 or 0 in op_consent for a year; keep our value and expiry.
		done();
		apply(p);
	});
}

// Reopens the cookie banner, for the footer link.
export function openCookieSettings() {
	window.dispatchEvent(new CustomEvent("op:consent", { detail: null }));
}

// User id only, no email. The workspace is a PostHog group.
export function identify(user: string, workspace?: string, plan?: string) {
	who = { user, workspace, plan };
	void ph?.then(apply);
}

// On sign-out. reset() also deletes the consent cookie, so opt back in
// after it, as PostHog advises, and restore the cookie.
export function resetAnalytics() {
	who = null;
	void ph?.then((p) => {
		if (!consented(p)) return;
		p.reset();
		p.opt_in_capturing({ captureEventName: false });
		remember(true);
	});
}
