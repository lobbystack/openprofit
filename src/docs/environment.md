---
navLabel: Environment Variables
contentType: Reference
description: Every environment variable a self-hosted OpenProfit instance reads, with defaults, what the optional usage ping sends, and how to connect PostHog.
---

# Environment variables

This reference lists every environment variable OpenProfit reads, with its default and purpose, and describes the optional usage ping. Set them on the container, for example with `-e` flags on `docker run`.

## Required variables

An instance doesn’t start correctly without these two:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SECRET_KEY` | None | 32 random bytes encoded as base64. Encrypts provider keys and signs sessions. Changing it makes stored provider keys unreadable |
| `APP_URL` | `http://localhost:3000` | Public address of the instance. Sign-in links point here |

## Database

OpenProfit uses an embedded Postgres database unless you give it a server:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `./data/openprofit` | A `postgres://` connection string, or a directory path for the embedded database |

## Email and sign-in

Without these, sign-in links print to the server log and only email sign-in is offered:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | None | Sends sign-in links, alerts and the weekly email through Resend |
| `EMAIL_FROM` | None | Sender address, for example `OpenProfit <mail@your_domain_here>` |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | None | Adds sign-in with GitHub. Use `your_app_url/api/auth/callback/github` as the callback URL |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | None | Adds sign-in with Google. Use `your_app_url/api/auth/callback/google` as the redirect URI |

## Background jobs

OpenProfit runs its scheduled jobs inside the server process:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SYNC_SCHEDULER` | `on` | Set to `off` to stop the sync, weekly email and usage ping jobs, for example on a second instance that shares the database |

## Hosted mode

These variables apply only to the hosted version at openprofit.dev. A self-hosted instance leaves them unset:

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_MODE` | `selfhost` | `cloud` turns on plans, billing and the sync cadence limits |
| `POLAR_ACCESS_TOKEN` | None | Polar organization token used to create checkouts and open the billing portal |
| `POLAR_PRODUCT_INDIE`, `POLAR_PRODUCT_PRO` | None | Polar product ids for the two paid plans |
| `POLAR_WEBHOOK_SECRET` | None | Secret that verifies subscription events sent to `/api/polar/webhook` |
| `OUTBOUND_IPS` | None | The server's outbound IP addresses, comma-separated. MongoDB Atlas only answers addresses on its access list, so in `cloud` mode the Atlas connector appears only when this is set, and its connect page lists these addresses to allow |

## Analytics and monitoring

OpenProfit sends nothing to PostHog unless you set `POSTHOG_KEY`. With it set, the server and the browser each send PostHog their own data:

- **Product events**: the server records sign-ups, workspaces created, connections added, removed or failing to sync, products created and removed, product assignments and checkouts. Each event carries the user id, the workspace id as a PostHog group, and fields such as the provider or plan. Events never include names, email addresses, amounts or keys. A user who switches off **Product analytics** in **Settings** sends no events. Scheduled sync failures have no user, so they use the distinct id `workspace-events`
- **Workspace properties**: with `APP_MODE=cloud`, the server sets each workspace group's properties when the workspace is created and once a day. They hold the plan, base currency, creation date, the member and product counts, and a connection count per provider
- **Web analytics**: the browser loads PostHog on every page in cookieless mode. PostHog stores nothing on the device and counts visitors with a daily hash of IP address and user agent. In your PostHog project, turn on **Cookieless server hash mode** under **Project Settings** > **Web analytics**, or PostHog drops these events
- **Cookies and session replay**: visitors see a cookie banner. Once they accept, PostHog sets its cookies, records session replays, and links the browser to the signed-in user id. They can change their choice under **Cookie settings** in the footer or **Replay and cookies** in **Settings**

Browser requests go to `/ingest` on your own domain, so ad blockers let them through. To send them to a PostHog managed reverse proxy instead, set `POSTHOG_PROXY`.

The server also sends PostHog its own tagged log lines, such as `[sync]` and `[weekly]`, a trace span for each request and background sync named by route, and server function errors. It replaces email addresses and anything shaped like a key or token first. Provider errors go out as their status code only, and provider and validation errors stay out of error tracking. None of these include a user id.

| Variable | Default | Purpose |
| --- | --- | --- |
| `POSTHOG_KEY` | None | Project token from your PostHog project settings, starting with `phc_` |
| `POSTHOG_HOST` | `https://us.i.posthog.com` | PostHog ingestion host. Use `https://eu.i.posthog.com` for an EU project |
| `POSTHOG_PROXY` | `/ingest` | Address of a PostHog managed reverse proxy on your own subdomain, such as `https://e.example.com` |

## Usage ping

The usage ping is off until you switch it on in **Settings**. Once on, the instance sends one request a day to `TELEMETRY_URL` (default `https://openprofit.dev/api/telemetry`) containing:

- an instance id: a one-way hash of `SECRET_KEY`
- the OpenProfit version
- the number of workspaces and products
- the number of connections per provider

It sends no names, amounts, email addresses or keys.
