# Cookie Policy

Last updated: October 6, 2026

This policy lists the cookies and browser storage that openprofit.dev sets. Lobbystack Inc. ("we") runs the site. The [Privacy Policy](/privacy) covers what we do with the data.

## Analytics without cookies

We use PostHog for analytics, and PostHog sets no cookies and stores nothing in your browser's local or session storage. That's why the site shows no cookie banner.

If you're signed out, or signed in with **Analytics** off in **Settings**, PostHog counts your visit anonymously, as the [Privacy Policy](/privacy) explains. If you're signed in with **Analytics** on, the default, PostHog records session replays of the dashboard and links them to your user id. It keeps that session in the page's memory, so reloading the page starts a new one.

## Cookies we set

You need these for the site to work, so we set them without asking:

| Name | Type | Purpose | Expires |
| --- | --- | --- | --- |
| `better-auth.session_token` | Cookie | Keeps you signed in. Named `__Secure-better-auth.session_token` over HTTPS | 7 days |
| `better-auth.state` | Cookie | Protects sign-in with Google or GitHub | 5 minutes |
| `op_ws` | Cookie | Remembers the workspace you picked | 1 year |
| `theme` | Local storage | Remembers light or dark mode | Until you clear it |
| `tsr-scroll-restoration-v1_3` | Session storage | Restores your scroll position when you go back | When you close the tab |

When we send analytics through PostHog's managed reverse proxy, the requests pass through Cloudflare, Inc., which PostHog lists as its subprocessor for that service.

Session replays never show what you type, and they hide all text, so names, emails and amounts stay out of the recording.

We set no advertising or cross-site tracking cookies.

## Self-hosted copies

A copy of OpenProfit running on someone else's server sets only the cookies in the table above. It loads no analytics unless its operator connects their own PostHog project.

## Contact

hello@openprofit.dev
