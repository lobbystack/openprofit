---
title: OpenProfit vs a spreadsheet
description: Most developers track product profit in a spreadsheet they update twice and abandon. Here's what OpenProfit does that the spreadsheet doesn't, and when the spreadsheet is enough.
---

# OpenProfit vs a spreadsheet

Most people who run a few software products track profit the same way: a spreadsheet with a row per month, revenue copied from Stripe, costs copied from each billing page. It works the first month. By the third, it's out of date.

## What the spreadsheet costs you

- **An hour a month, at least.** Log in to Stripe, OpenAI, Anthropic, Vercel, Cloudflare, Railway. Find the right date range. Copy the numbers. Convert currencies.
- **Usage costs don't split.** OpenAI and Vercel bill you per project, but the invoice is one number. Splitting it by product means digging into usage exports.
- **It's always last month.** You find out a bill doubled when you fill in the row, weeks after it happened.
- **Fees and refunds slip through.** Gross volume from Stripe is easy to copy. Net, after fees, refunds and disputes, takes more work, so the sheet overstates revenue.

## What OpenProfit does instead

| | Spreadsheet | OpenProfit |
| --- | --- | --- |
| Updating | By hand, monthly | Automatic, every 15 minutes to 6 hours |
| Revenue | Usually gross | Net of fees and refunds |
| Usage costs per product | Manual exports | By OpenAI project, Vercel project, Anthropic workspace, Railway project |
| Currencies | Look up a rate | Daily European Central Bank rate per line |
| Spikes | Noticed at month end | Alert the day a bill doubles |
| History | Whatever you typed | Two years, pulled on the first sync |
| Price | Free | Free under $2,500 MRR, free to self-host |

## When the spreadsheet is enough

If you have one product, two bills and no usage-based costs, a spreadsheet is fine. Once AI tokens or hosting usage are a real line in your costs, or you run more than one product, the copying becomes the job.

## Keep the spreadsheet for what it's good at

Taxes, payroll and one-off purchases still belong in your books. OpenProfit covers the recurring revenue and recurring bills of your products, and for anything without an API you add a flat monthly or yearly amount once.
