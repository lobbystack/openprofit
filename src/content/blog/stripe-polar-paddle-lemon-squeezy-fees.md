---
title: Stripe vs Polar vs Paddle vs Lemon Squeezy: what you keep
description: What you keep from a $20 subscription on Stripe, Polar, Paddle, Lemon Squeezy and Stripe Managed Payments, with every fee, tax trade-off and payout term.
date: 2026-10-19
author: Raphael Morency
---

# Stripe vs Polar vs Paddle vs Lemon Squeezy: what you keep

On a $20 monthly subscription paid with a US card, Stripe leaves you $18.98. Polar and Paddle leave you $18.50, and Lemon Squeezy $18.40. The difference pays for sales tax: Polar, Paddle and Lemon Squeezy collect and file it in every country, and with Stripe you do that yourself.

The fees below come from each provider's own pricing pages and docs, checked on October 19, 2026, for a seller based in the US.

## What a merchant of record does

A merchant of record sells your product to the customer in its own name. Polar, Paddle and Lemon Squeezy work this way: they charge the customer, add the right sales tax or VAT, file the tax returns in each country, and pay you what's left after their fee. The customer's card statement shows their name, and the tax stays out of your revenue.

Stripe is a payment processor. You are the seller, so you register for sales tax where you owe it. If your business is outside the EU, you may have to register for EU VAT from your first sale there. [Stripe Tax](https://docs.stripe.com/tax/filing) calculates and collects the tax, and you still file and pay it.

Stripe also sells a merchant of record service: [Stripe Managed Payments](https://stripe.com/managed-payments) adds 3.5% to the normal Stripe fees. It covers digital products only, sellers in 37 countries, and access goes through an eligibility review.

## The fees

| | Stripe | Stripe Managed Payments | Polar | Lemon Squeezy | Paddle |
|---|---|---|---|---|---|
| US card | 2.9% + 30¢ | 2.9% + 30¢, plus 3.5% | 5% + 50¢ | 5% + 50¢ | 5% + 50¢ |
| Card from outside the US | +1.5% | +1.5% | +1.5% | +1.5% | Included |
| Subscriptions | +0.7% | +0.7% | Included | +0.5% | Included |
| PayPal | Not listed | Not listed | Not supported | +1.5% | Included |
| Sales tax and VAT | You file; Stripe Tax adds 0.5% where you're registered | Stripe files | Polar files | Lemon Squeezy files | Paddle files |
| Dispute | $15 | $15 | $15 | $15 | $20 |

Sources: [Stripe](https://stripe.com/us/pricing), [Polar](https://polar.sh/docs/merchant-of-record/fees), [Lemon Squeezy](https://docs.lemonsqueezy.com/help/getting-started/fees) and [Paddle](https://www.paddle.com/pricing).

Stripe's subscription fee is Stripe Billing's 0.7% of billing volume. Polar's price applies to organizations created since May 27, 2026; older ones keep 4% + 40¢ plus 0.5% on subscriptions. Polar also sells plans from $20 a month that lower the rate, down to 3.4% + 30¢.

Every merchant of record charges its percentage on the full amount the customer pays, tax included.

## What you keep from one sale

| Sale | Stripe | Managed Payments | Polar | Lemon Squeezy | Paddle |
|---|---|---|---|---|---|
| $20 a month, US card | $18.98 | $18.28 | $18.50 | $18.40 | $18.50 |
| €20 a month with VAT, German card | $17.31 | $16.64 | $16.91 | $16.80 | $16.80 to $17.25 |
| $5 a month, US card | $4.52 | $4.34 | $4.25 | $4.22 | $4.25 |
| $99 a year, US card | $95.14 | $91.67 | $93.55 | $93.05 | $93.55 |

The US rows assume no sales tax on the sale. The German row converts €20 at the European Central Bank's rate of October 19, 2026, $22.45, of which $3.58 is the 19% VAT. On Stripe, it includes Stripe Tax and leaves out the cost of filing the EU VAT return yourself. Paddle's range depends on whether it converts the whole sale to dollars at its 2% currency margin.

On 100 customers paying $20, a merchant of record costs you $48 to $58 a month more than Stripe. In exchange, the merchant of record registers for VAT and files the sales tax returns for those sales.

Fixed fees weigh most on small prices. At $5 a month, Polar and Paddle keep 15% of each sale, and Stripe keeps 9.6%. Lemon Squeezy and Paddle offer custom pricing for products under $10. A yearly plan charges the fixed fee once instead of twelve times: $99 a year on Polar costs $5.45 in fees, against $10.95 for twelve monthly payments of $8.25.

## Refunds, disputes and payouts

The fee tables leave out three things that change what reaches your bank:

- **Refunds.** Stripe, Polar and Lemon Squeezy keep their original fee when you refund a sale. Paddle's terms let it recover its fees on a refund without stating the amount.
- **Disputes.** Each one costs $15, or $20 on Paddle, and Paddle keeps the $20 even when it wins. Stripe charges another $15 if you respond to the dispute, and returns that one when you win.
- **Payouts.** Stripe pays out every business day for free. [Polar](https://polar.sh/docs/features/finance/payouts) pays when you request a withdrawal, seven days after the sale for organizations created since May 12, 2026, and passes on Stripe's payout fees: $2 for each month with a payout, plus 0.25% + 25¢ per payout. Lemon Squeezy pays twice a month above $50, and Paddle once a month above $100.

## What happened to Lemon Squeezy

Stripe bought Lemon Squeezy in 2024. In a [January 2026 update](https://www.lemonsqueezy.com/blog/2026-update), the Lemon Squeezy team wrote that it is building Stripe Managed Payments and plans to give Lemon Squeezy users a way to move there. Lemon Squeezy still takes new stores, and as of October 19, 2026, nobody has announced a date for it to close. If you start today, expect to move to Managed Payments at some point.

## Which one to pick

- **Most of your customers are in the US, or you're already registered for sales tax:** Stripe keeps the most of each sale.
- **You sell to consumers in the EU or the UK and don't want to register for VAT:** a merchant of record. Paddle includes international cards and PayPal in its 5% + 50¢; Polar pays out faster and has cheaper plans once you sell more than about $1,400 a month.
- **You already run on Stripe and want it to handle tax:** Stripe Managed Payments, if you pass the eligibility review. Of the five, it leaves you the least on a $20 or $99 sale.
- **Your price is under $10:** fixed fees take a large share everywhere. Sell yearly plans, or ask Paddle or Lemon Squeezy for custom pricing.

## Track what you keep

Whichever you pick, the payout in your bank is smaller than your sales. Your books need the sales, the fees and the refunds as separate lines, and the tax a merchant of record collects isn't your revenue. [How to get Stripe into QuickBooks or Xero](/blog/stripe-quickbooks-xero) shows the entries, and [Revenue vs profit](/blog/revenue-vs-profit-saas) shows where fees sit between your MRR and your profit.

OpenProfit reads Stripe, Polar, Paddle and Lemon Squeezy through their APIs and shows your revenue after fees and refunds, with sales tax and VAT kept apart, next to the costs of each app. If you switch providers, connect both, and the revenue from each lands on the same product.
