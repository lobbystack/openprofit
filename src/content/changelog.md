---
title: Changelog
description: What's new in OpenProfit. Every release, newest first.
---

# Changelog

Every release, newest first. The full history is in the [commit log on GitHub](https://github.com/lobbystack/openprofit/commits/main).

## October 6, 2026

- **Paddle, Lemon Squeezy and RevenueCat.** Three new revenue connectors. Paddle brings completed transactions without tax, its fee, refunds and chargebacks. Lemon Squeezy brings orders, renewals and refunds; its API has no fees, so revenue shows before them. RevenueCat brings monthly revenue and proceeds after store commission. All three add MRR and active subscriptions.
- **Syncs recover on their own.** When a provider answers 429, OpenProfit waits as long as the provider asks and tries again. A failed sync retries after an hour, then waits twice as long after each failure, up to a day. A rejected key waits for you to click **Sync now**. After an outage, the next sync rereads every day it missed.
- **Synced lines stay in step with the provider.** A resync updates every field and deletes lines the provider no longer reports, within the history its API returns. Revenue maps to products by Paddle product, Lemon Squeezy product or RevenueCat project, like costs do.
- **MRR counts every currency.** Stripe and Lemon Squeezy MRR left out all but the largest currency, and RevenueCat added projects in different currencies as if they were one. Each currency now converts at the day's rate before the totals add up.
- **OpenRouter, DigitalOcean, GitHub and Twilio connectors.** OpenRouter reports daily cost per API key and model for the last 30 days. DigitalOcean reports monthly cost per project from your invoices. GitHub reports daily Actions, Copilot and Packages charges per repository, for an organization or a personal account. Twilio reports your daily usage total.
- **Firecrawl and Resend connectors.** Neither API reports dollars, so OpenProfit prices their usage at published rates. Firecrawl costs split by API key per billing period, Resend costs by sending domain per day. Firecrawl detects your plan; for Resend, you pick it.
- **xAI, Neon and MongoDB Atlas connectors.** Daily Grok API spend by model from xAI, each Neon project's monthly usage at Neon's published rates, and daily MongoDB Atlas invoice lines per project, the current month included.
- **Optional fields no longer block connecting.** Connectors with an optional field, like Railway's workspace id or Vercel's team id, submitted nothing if you left it empty. They connect now.
- **Self-hosting with the built-in database works from the Docker image.** The production build dropped files the embedded Postgres needs, so the container failed on its first start. Fixed.
- **Pages load faster.** HTML is compressed; the homepage went from 74 KB to 15 KB.
- **Link previews.** Sharing openprofit.dev on X, Slack or Hacker News shows a title card.

## October 5, 2026

The first release.

- **Seven connectors.** Stripe and Polar for revenue. OpenAI, Anthropic, Vercel, Cloudflare and Railway for costs. Flat monthly or yearly costs for anything without an API.
- **Profit per product.** Map each OpenAI project, Vercel project, Anthropic workspace, Railway project or Cloudflare zone to the product it serves.
- **Overview** with revenue, costs, profit, MRR and customers for this month, last month, the last 3 or 12 months, or this year, each compared with the period before.
- **One base currency** per workspace, at that day's European Central Bank rate. You can change it later and every line converts again.
- **Alerts** when a cost doubles, a margin drops under its floor, or a sync fails, plus a weekly email every Monday.
- **Public pages** per product: full numbers, revenue only, or percentages.
- **Workspaces** with a switcher, and sign-in by email link, GitHub or Google.
- **Dark mode.**
- **Self-hosting** in one container with Postgres built in, or a `postgres://` URL to your own. MIT licensed.
