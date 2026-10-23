---
title: The monthly cost of running a SaaS, line by line
description: A SaaS stack priced at three sizes, from a free side project to $20,000 MRR, with October 2026 prices for Vercel, Supabase, Resend, Sentry, PostHog and Stripe.
date: 2026-10-19
author: Raphael Morency
---

# The monthly cost of running a SaaS, line by line

A side project can run on free tiers for the price of a domain, about $0.93 a month. At 100 paying customers the same stack costs $218 to $416 a month, and at 1,000 customers $1,883 to $3,167. Payment fees and product analytics make up most of it, and an AI feature can add more than both.

I took the prices below from each provider's pricing page on October 19, 2026. The usage figures, such as emails sent and events tracked, are my estimates for a typical web app, so swap in your own.

## The stack

One common setup for a solo developer:

| Job | Provider |
|---|---|
| Hosting | [Vercel](https://vercel.com/pricing) |
| Database and sign-in | [Supabase](https://supabase.com/pricing) |
| Email | [Resend](https://resend.com/pricing) |
| Error tracking | [Sentry](https://sentry.io/pricing/) |
| Product analytics | [PostHog](https://posthog.com/pricing) |
| DNS | [Cloudflare](https://www.cloudflare.com/plans/) free plan |
| Uptime checks | [UptimeRobot](https://uptimerobot.com/pricing/) free plan |
| Domain | A .com at cost |
| Payments | [Stripe](https://stripe.com/us/pricing) |

A .com costs $11.17 a year at cost from November 1, 2026: Verisign's new [$10.97 wholesale price](https://www.sec.gov/Archives/edgar/data/0001014473/000101447326000028/vrsn-20260630.htm) plus ICANN's $0.20 fee. Cloudflare Registrar charges that price with no markup; Namecheap renews a .com at $18.48.

## Side project: $0.93 a month

Each line above fits a free plan for an app with a few dozen users and no revenue, so you pay for the domain alone.

Two free plans stop fitting before you have many users:

- **Vercel Hobby** is for "non-commercial, personal use only". The day you charge for the app, you need Pro at $20 a month, or a host such as Railway, whose Hobby plan starts at $5.
- **Supabase Free** pauses a project after a week without activity, and lists no backups. Pausing suits a prototype; once customers pay, you'll want Pro's daily backups.

## 100 customers, $2,000 MRR: $218 to $416

Assume 1,000 monthly active users, 20,000 emails and 2 million analytics events a month:

| Line | Plan | Per month |
|---|---|---|
| Hosting | Vercel Pro | $20 |
| Database and sign-in | Supabase Pro | $25 |
| Email | Resend Pro, 50,000 emails | $20 |
| Error tracking | Sentry Developer, one user | $0 |
| Product analytics | PostHog, 2 million events | $50 to $248 |
| DNS, uptime checks | Free plans | $0 |
| Domain | .com at cost | $0.93 |
| Payment fees | Stripe, 100 charges of $20 | $102 |
| **Total** | | **$218 to $416** |

That's 11% to 21% of MRR. Hosting, database and email together cost $65.

PostHog's range depends on one setting. The first million events each month cost nothing, and the next million cost $0.00005 each. PostHog adds $0.000198 for each event tied to a signed-in user's profile, which turns $50 into $248. PostHog says anonymous events cost up to four times less than identified ones.

Stripe's line is 2.9% + 30¢ per card payment plus 0.7% for Stripe Billing, or $1.02 on each $20 charge. [Stripe vs Polar vs Paddle vs Lemon Squeezy](/blog/stripe-polar-paddle-lemon-squeezy-fees) compares what each processor leaves you.

## 1,000 customers, $20,000 MRR: $1,883 to $3,167

Assume 10,000 monthly active users, 200,000 emails and 20 million analytics events a month:

| Line | Plan | Per month |
|---|---|---|
| Hosting | Vercel Pro plus the 10 million request CDN tier | $40 |
| Database and sign-in | Supabase Pro | $25 |
| Email | Resend Pro, 100,000 emails plus 100,000 at $0.90 per thousand | $125 |
| Error tracking | Sentry Team | $29 |
| Product analytics | PostHog, 20 million events | $643 to $1,928 |
| DNS, uptime checks | Free plans | $0 |
| Domain | .com at cost | $0.93 |
| Payment fees | Stripe, 1,000 charges of $20 | $1,020 |
| **Total** | | **$1,883 to $3,167** |

That's 9% to 16% of MRR. Hosting, database, email and error tracking cost $219 together, about 1% of revenue.

Stripe takes the largest fixed share, 5.1% of sales. Analytics comes second, and with identified events it passes Stripe. If you don't need a person profile on each event, turn profiles off for anonymous traffic, or capture fewer events.

Sentry's Team plan costs $29 billed monthly, or $26 a month billed yearly. Resend's Scale plan with 200,000 emails costs $160, so paying overage on Pro saves $35.

## AI tokens, if your app calls a model

The totals above leave out AI APIs. If your app calls one, tokens can pass the other lines. On Claude Sonnet 5.5, a user who sends 600 chat messages and asks for 10 document summaries a month costs about $5.90 in tokens. At 1,000 customers that's $5,900 a month, more than the rest of the stack and Stripe combined. [AI token cost per user](/blog/ai-token-cost-per-user) shows how to work out your own number.

## The limit that forces each upgrade

- **Vercel:** Hobby forbids commercial use. Pro includes 1 million CDN requests and 1 TB of transfer, then moves you to a $20 tier with 10 million requests.
- **Supabase:** Free caps the database at 500 MB and egress at 5 GB, and pauses inactive projects. Pro includes 8 GB of disk, 250 GB of egress and 100,000 monthly active users.
- **Resend:** Free allows 3,000 emails a month and 100 a day. A busy day of password resets and receipts can pass that.
- **PostHog:** Free drops events past 1 million a month.
- **Sentry:** Developer allows one user and 5,000 errors a month.

## Cheaper swaps

| Swap | Cost at 100 customers |
|---|---|
| Render web service and Postgres for Vercel and Supabase | $13: $7 for the service, $6 for the database |
| Railway Hobby for Vercel and Supabase | About $12 to $15 in usage, with a $5 minimum |
| Neon Launch for the Supabase database | About $20 with compute always on, less with scale to zero |
| Clerk for Supabase sign-in | $0 up to 50,000 monthly retained users |

Sources: [Render](https://render.com/pricing), [Railway](https://railway.com/pricing), [Neon](https://neon.com/pricing) and [Clerk](https://clerk.com/pricing). The Railway and Neon figures are my estimates for a small app and database, at their published rates.

You can go further and run the whole app on one server. A founder who runs several $10,000 MRR companies on a $20 a month stack [drew 517 comments on Hacker News](https://news.ycombinator.com/item?id=47736555) in April 2026. You then handle backups, updates and outages yourself.

## Track the real number

Your stack's cost moves with usage, and each line sits on its own billing page. OpenProfit reads Vercel, Railway, Cloudflare, Neon, Resend and nine other providers through their billing APIs, and Stripe, Polar, Paddle, Lemon Squeezy and RevenueCat for revenue. OpenProfit has no connector for Supabase, Sentry or PostHog, so you enter their plans once as flat costs.

You then see each app's costs, revenue after fees and margin by day, with an alert when a provider's daily spend doubles. [Revenue vs profit](/blog/revenue-vs-profit-saas) shows how those costs turn into a margin.
