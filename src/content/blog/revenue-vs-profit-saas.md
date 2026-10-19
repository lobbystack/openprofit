---
title: Revenue vs profit: how to know if your SaaS makes money
description: Revenue is what customers pay you. Profit is what you keep after fees, refunds, AI tokens, hosting and every other bill. How to work out both for a SaaS.
date: 2026-10-19
author: Raphael Morency
---

# Revenue vs profit: how to know if your SaaS makes money

Revenue is what your customers pay you. Profit is what you keep after every cost of earning it: payment fees, refunds, AI tokens, hosting, email and the tools you pay for each month. Stripe can show $2,000 in MRR for an app that loses money, because Stripe only sees the money coming in.

## Revenue and profit, defined

Four numbers sit between what customers pay and what you keep:

| Number | How to get it | In a SaaS |
|---|---|---|
| Revenue | What customers paid, minus the sales tax or VAT you collected | Sales in Stripe, Polar, Paddle or Lemon Squeezy |
| Net revenue | Revenue minus refunds and discounts | The sales you keep after refunds |
| Gross profit | Net revenue minus the cost of revenue | The cost of revenue grows with each customer: payment fees, AI tokens, hosting, database, email and SMS |
| Net profit | Gross profit minus every other cost | Tools, domains, contractors, ads, an accountant |

Two percentages come out of these:

```text
Gross margin = (net revenue − cost of revenue) ÷ net revenue × 100
Net margin   = net profit ÷ net revenue × 100
```

Gross margin tells you whether each new customer makes you money. Net margin tells you whether the whole business does.

## One month of a $2,000 MRR AI app

Take an app with 100 customers on a $20 monthly plan, billed through Stripe at its US card price of 2.9% + 30¢ plus 0.7% for Stripe Billing, with an OpenAI feature:

| Line | Amount |
|---|---|
| Sales, 100 × $20 | $2,000 |
| Refunds, 2 customers | −$40 |
| **Net revenue** | **$1,960** |
| Stripe fees, 100 charges | −$102 |
| OpenAI tokens | −$610 |
| Hosting on Vercel | −$45 |
| Database on Supabase | −$25 |
| Email on Resend | −$20 |
| **Gross profit** | **$1,158** |
| Gross margin | 59% |
| Domain, error tracking, design tool | −$60 |
| **Net profit** | **$1,098** |

The Stripe dashboard shows $2,000. The founder keeps $1,098, 55% of it, before income tax. Stripe keeps its fee when you refund a charge, so the two refunds still cost their fees.

Token spend is the line to watch. If ten heavy users double next month's OpenAI bill to $1,220 with the same customers, gross profit falls to $548 and gross margin to 28%. MRR stays at $2,000, so the Stripe dashboard shows nothing wrong.

The numbers from a real product are smaller. Over the last 30 days, [Lobbystack](https://openprofit.dev/p/lobbystack/lobbystack), the app my company sells, made $164 in revenue after Polar's fees. OpenAI cost $39, Twilio $15 and Railway $12, which leaves $98 in profit and a 60% margin. OpenProfit reads those amounts from the Polar, OpenAI, Twilio and Railway APIs.

## The costs between your MRR and your profit

Each cost lives on a different page:

- **Payment fees, refunds and disputes.** Your processor takes them out before the payout, so the deposit in your bank is smaller than your revenue. [How to get Stripe into QuickBooks or Xero](/blog/stripe-quickbooks-xero) shows the entries for one month.
- **Sales tax and VAT.** You collect them for the government, so they don't count as revenue. Polar, Paddle and Lemon Squeezy act as the merchant of record: they collect and file the tax, then pay you the rest after their fee.
- **AI APIs.** OpenAI, Anthropic, OpenRouter and xAI bill by token. Their usage pages split spend by project, workspace or API key, and the invoice arrives after the month ends.
- **Hosting and infrastructure.** Vercel, Railway, Cloudflare, DigitalOcean, Neon and MongoDB Atlas charge a plan price plus usage, and the usage part moves with your traffic.
- **Email, SMS and other APIs.** Resend, Twilio and Firecrawl charge per message or per request.
- **Bills with no API.** A domain, a design tool or an accountant's fee shows up only on a card statement.

Your own time is a cost too. Profit ignores it unless you pay yourself a salary, so compare the profit with what an hour of your time is worth.

## Why profit is hard to see

Every bill above sits on its own billing page, with its own date range and currency. Usage bills change by the day, and you learn the total when the card gets charged. When one OpenAI account serves three apps, the bill says what the account spent and leaves out which app spent it.

Stripe shows the revenue, each provider shows its own costs, and nothing puts the two side by side. Founders end up with a monthly spreadsheet, or a rough sense that the app "probably" makes money.

## Three ways to see every cost in one place

### A spreadsheet

Make one row per month, with columns for sales, refunds, payment fees and each provider. On the first of each month, copy each total from its billing page and add the margin formulas. For one app with two flat bills, this works and costs nothing.

It breaks once token or hosting usage becomes a real cost line, or once you run a second app on the same provider accounts. The copying takes an hour a month, and a cost spike shows up a month late. [OpenProfit vs a spreadsheet](/compare/spreadsheet) covers where each one fits.

### Accounting software

QuickBooks and Xero give you a profit and loss statement from your bank feed. A bookkeeper sorts the transactions, so the statement arrives after the month closes. Bills paid on your personal card don't reach the company's bank, so the books miss them. [My SaaS bills go on my personal card, so I built my own books](/blog/why-not-quickbooks) explains that gap.

### OpenProfit

OpenProfit reads revenue from Stripe, Polar, Paddle, Lemon Squeezy and RevenueCat, and costs from the billing APIs of 14 providers including OpenAI, Anthropic, Vercel and Railway. Paste an API key for each one and two years of history fill in. You get revenue, costs, profit and margin per app, by day, in one currency. Bills with no API go in once as flat costs, at their monthly, yearly or one-time price.

When a bill jumps, an alert reaches you by email, Slack or SMS before the invoice does. OpenProfit is open source under the MIT license, and the hosted version is free up to $2,500 in MRR.

## Profit per app, when you run more than one

If three apps share one OpenAI account, give each app its own OpenAI project and its own API key. OpenAI then reports spend per project, and so do Vercel per project, Anthropic per workspace, Railway per project and Cloudflare per zone.

In OpenProfit, point each project at the app it serves. Its costs move to that app, history included, and the costs you haven't assigned wait in an Unassigned bucket until you decide. You can then see which app pays for its tokens and which one lives off the others.

## What margin to aim for

Benchmarkit's 2026 survey of 342 B2B SaaS and AI-native companies puts software gross margin at 80%, according to [Aleph's summary](https://www.getaleph.com/blog/2026-saas-benchmarks-takeaways). AI apps run lower. Bessemer's [State of AI 2025](https://www.bvp.com/atlas/the-state-of-ai-2025) reports about 60% gross margins for its steadier AI startups and about 25%, often negative, for the fastest-growing ones.

A 60% gross margin is normal for an app built on an AI API. The same 60% on a SaaS without AI features means a cost line to go find.

## Before you call your SaaS profitable

- Count revenue after refunds, with sales tax and VAT taken out.
- Put payment fees, AI tokens and hosting in the cost of revenue, and work out your gross margin.
- Read usage bills by day, and stop waiting for the invoice.
- Split shared provider accounts by project, one per app.
- Check the margin again after any bill jumps.

To see your own numbers, [create an account on OpenProfit](https://openprofit.dev/login), connect Stripe or Polar and your largest bill, and your profit per app fills in within minutes.
