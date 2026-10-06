---
navLabel: Environment Variables
contentType: Reference
description: Every environment variable a self-hosted OpenProfit instance reads, with defaults, and what the optional usage ping sends.
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

## Usage ping

The usage ping is off until you switch it on in **Settings**. Once on, the instance sends one request a day to `TELEMETRY_URL` (default `https://openprofit.dev/api/telemetry`) containing:

- an instance id: a one-way hash of `SECRET_KEY`
- the OpenProfit version
- the number of workspaces and products
- the number of connections per provider

It sends no names, amounts, email addresses or keys.
