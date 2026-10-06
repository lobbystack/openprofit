import type { PostHog } from "posthog-js";

// PostHog in the browser. Nothing loads until the visitor accepts in the
// cookie banner or in Settings; the choice lives in the op_consent cookie so
// the server renders the banner (or not) without a flash.

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
// Calls made before we know whether PostHog runs on this page. Null once
// we know it does not.
let pending: ((p: PostHog) => void)[] | null = [];
let who: { user: string; workspace?: string; plan?: string } | null = null;

// Replay never shows digits, and inside the app it shows no text at all:
// amounts, names and emails are all masked.
const mask = (text: string) =>
	/^\/(app|onboarding)(\/|$)/.test(location.pathname)
		? text.replace(/\S/g, "*")
		: text.replace(/\d/g, "*");

export function readConsent(): Consent {
	const m = document.cookie.match(/(?:^|; )op_consent=(yes|no)/);
	return (m?.[1] as Consent) ?? null;
}

function apply(p: PostHog) {
	if (!who) return;
	p.identify(who.user);
	if (who.workspace)
		p.group("workspace", who.workspace, who.plan ? { plan: who.plan } : {});
}

function start(cfg: AnalyticsConfig) {
	if (!cfg.key) return;
	const key = cfg.key;
	ph ??= import("posthog-js").then(({ default: posthog }) => {
		posthog.init(key, {
			api_host: cfg.apiHost,
			ui_host: cfg.uiHost,
			defaults: "2026-08-30",
			person_profiles: "identified_only",
			// Declining later also deletes PostHog's cookies and storage.
			opt_out_persistence_by_default: true,
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
		for (const fn of pending ?? []) fn(posthog);
		pending = null;
		return posthog;
	});
	void ph.then(
		(p) =>
			p.has_opted_out_capturing() &&
			p.opt_in_capturing({ captureEventName: false }),
	);
}

function run(fn: (p: PostHog) => void) {
	if (ph) void ph.then(fn);
	else pending?.push(fn);
}

// Once per page load, from the root route.
export function initAnalytics(cfg: AnalyticsConfig) {
	if (cfg.key && readConsent() === "yes") start(cfg);
	else if (!ph) pending = null;
}

// The banner and the Settings row both land here; takes effect at once.
export function setConsent(cfg: AnalyticsConfig, yes: boolean) {
	const secure = location.protocol === "https:" ? "; Secure" : "";
	// biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API is missing in some browsers
	document.cookie = `${CONSENT_COOKIE}=${yes ? "yes" : "no"}; Path=/; Max-Age=${60 * 60 * 24 * 180}; SameSite=Lax${secure}`;
	window.dispatchEvent(new CustomEvent("op:consent", { detail: yes }));
	if (yes) start(cfg);
	else void ph?.then((p) => p.opt_out_capturing());
}

// Reopens the cookie banner, for the footer link.
export function openCookieSettings() {
	window.dispatchEvent(new CustomEvent("op:consent", { detail: null }));
}

export function track(event: string, props?: Record<string, unknown>) {
	run((p) => p.capture(event, props));
}

// User id only, no email. The workspace is a PostHog group.
export function identify(user: string, workspace?: string, plan?: string) {
	who = { user, workspace, plan };
	void ph?.then(apply);
}

export function resetAnalytics() {
	who = null;
	void ph?.then((p) => p.reset());
}
