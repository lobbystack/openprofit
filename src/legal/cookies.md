# Cookie Policy

Last updated: October 6, 2026

This policy lists the cookies and browser storage that openprofit.dev sets, and how you change them. Lobbystack Inc. ("we") runs the site. The [Privacy Policy](/privacy) covers what we do with the data.

## Visits without cookies

PostHog counts your visits to openprofit.dev without cookies or any other storage on your device, as the [Privacy Policy](/privacy) explains. We show no cookie banner: the site sets no analytics cookies and records no session replays unless you're signed in with **Analytics** on, as described below.

## Analytics in the dashboard

Your account has an **Analytics** switch in **Settings**. It starts on. While it's on, PostHog sets the cookies and storage entries in the second table below, links your browser to your user id, and records session replays of the dashboard. It records no replays of the public site, but in that browser it uses the same cookies when you visit it.

Turn **Analytics** off, or sign out, and we delete PostHog's cookies and storage entries from that browser and count your visits without cookies again. The switch belongs to your account, so it applies in every browser you sign in on.

## Cookies we always set

You need these for the site to work, so we set them without asking:

| Name | Type | Purpose | Expires |
| --- | --- | --- | --- |
| `better-auth.session_token` | Cookie | Keeps you signed in. Named `__Secure-better-auth.session_token` over HTTPS | 7 days |
| `better-auth.state` | Cookie | Protects sign-in with Google or GitHub | 5 minutes |
| `op_ws` | Cookie | Remembers the workspace you picked | 1 year |
| `theme` | Local storage | Remembers light or dark mode | Until you clear it |
| `tsr-scroll-restoration-v1_3` | Session storage | Restores your scroll position when you go back | When you close the tab |

## Analytics cookies, while Analytics is on

PostHog sets these, where `<token>` is our PostHog project token:

| Name | Type | Purpose | Expires |
| --- | --- | --- | --- |
| `ph_<token>_posthog` | Cookie and local storage | A random id for your browser, and your current session | 1 year |
| `ph_<token>_posthog_cpm` | Cookie | Bookkeeping for the cookie above | 1 year |
| `ph_<token>_posthog__flags` | Local storage | Remembers PostHog's settings for this site so it starts faster | Until you turn Analytics off or clear it |
| `__ph_opt_in_out_<token>` | Local storage | Records that Analytics is on in this browser | Until you turn Analytics off or clear it |
| `ph_<token>_posthog`, `ph_<token>_window_id`, `ph_<token>_primary_window_exists`, `ph_<token>_session_registered_properties` | Session storage | Tie events and replays to the current tab | When you close the tab |

When we send analytics through PostHog's managed reverse proxy, the requests pass through Cloudflare, Inc., which PostHog lists as its subprocessor for that service.

Session replays never show what you type, and they hide all text, so names, emails and amounts stay out of the recording.

We set no advertising or cross-site tracking cookies.

## Self-hosted copies

A copy of OpenProfit running on someone else's server sets only the cookies in the first table. It loads no analytics unless its operator connects their own PostHog project.

## Contact

hello@openprofit.dev
