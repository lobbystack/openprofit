# Cookie Policy

Last updated: October 6, 2026

This policy lists the cookies and browser storage that openprofit.dev sets, and how you change your choice. Lobbystack Inc. ("we") runs the site. The [Privacy Policy](/privacy) covers what we do with the data.

## Your choice

On your first visit we ask whether you accept PostHog's cookies and session replay. Until you answer, and if you decline, PostHog runs without cookies: it sets none of the analytics cookies below, stores nothing else in your browser, and records no replays. It still counts your visit, as the [Privacy Policy](/privacy) explains.

You can change your mind at any time:

- On the website, open **Cookie settings** in the footer.
- In the dashboard, use the **Replay and cookies** row in **Settings**.

Your choice applies to the browser you made it in. Signing in on another device asks again.

## Cookies we always set

You need these for the site to work, so we set them without asking:

| Name | Type | Purpose | Expires |
| --- | --- | --- | --- |
| `better-auth.session_token` | Cookie | Keeps you signed in. Named `__Secure-better-auth.session_token` over HTTPS | 7 days |
| `better-auth.state` | Cookie | Protects sign-in with Google or GitHub | 5 minutes |
| `op_ws` | Cookie | Remembers the workspace you picked | 1 year |
| `op_consent` | Cookie | Remembers your cookie choice. PostHog reads it too | 180 days |
| `theme` | Local storage | Remembers light or dark mode | Until you clear it |
| `tsr-scroll-restoration-v1_3` | Session storage | Restores your scroll position when you go back | When you close the tab |

## Analytics cookies, after you accept

Once you accept, PostHog recognizes your browser across visits and records session replays. PostHog sets these, where `<token>` is our PostHog project token:

| Name | Type | Purpose | Expires |
| --- | --- | --- | --- |
| `ph_<token>_posthog` | Cookie and local storage | A random id for your browser, and your current session | 1 year |
| `ph_<token>_posthog_cpm` | Cookie | Bookkeeping for the cookie above | 1 year |
| `ph_<token>_posthog__flags` | Local storage | Remembers PostHog's settings for this site so it starts faster | Until you decline or clear it |
| `ph_<token>_posthog`, `ph_<token>_window_id`, `ph_<token>_primary_window_exists`, `ph_<token>_session_registered_properties` | Session storage | Tie events and replays to the current tab | When you close the tab |

When we send analytics through PostHog's managed reverse proxy, the requests pass through Cloudflare, Inc., which PostHog lists as its subprocessor for that service.

When you decline after accepting, we delete PostHog's cookies and storage entries, stop the replay, and count your visits without cookies from that page on.

Session replays never show what you type. Inside the dashboard they hide all text, so names, emails and amounts stay out of the recording. On the public site they hide every digit.

We set no advertising or cross-site tracking cookies.

## Self-hosted copies

A copy of OpenProfit running on someone else's server sets only the cookies in the first table. It shows no banner and loads no analytics unless its operator connects their own PostHog project.

## Contact

hello@openprofit.dev
