---
title: Stripe vs Polar vs Paddle vs Lemon Squeezy: what you keep
description: Your share of a $20 subscription on Stripe, Polar, Paddle, Lemon Squeezy and Stripe Managed Payments, with each fee, the tax trade-off and payout terms.
date: 2026-10-19
author: Raphael Morency
---

# Stripe vs Polar vs Paddle vs Lemon Squeezy: what you keep

On a $20 monthly subscription paid with a US card, Stripe leaves you $18.98. Polar and Paddle leave you $18.50, and Lemon Squeezy $18.40. You pay that difference for tax handling: Polar, Paddle and Lemon Squeezy collect and file sales tax in each country, and with Stripe you do it yourself.

I took the fees below from each provider's pricing pages and docs on October 19, 2026, for a seller based in the US.

## Merchant of record vs payment processor

A merchant of record sells your product to the customer in its own name. Polar, Paddle and Lemon Squeezy work this way: they charge the customer, add the right sales tax or VAT, file the tax returns in each country, and pay you what's left after their fee. The customer's card statement shows their name, and the tax stays out of your revenue.

Stripe is a payment processor. You are the seller, so you register for sales tax where you owe it. If your business is outside the EU, you may have to register for EU VAT from your first sale there. [Stripe Tax](https://docs.stripe.com/tax/filing) calculates and collects the tax, and you file and pay it.

Stripe also sells a merchant of record service: [Stripe Managed Payments](https://stripe.com/managed-payments) adds 3.5% to the normal Stripe fees. It covers digital products sold by sellers in 37 countries, and Stripe reviews each seller before granting access.

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

All four merchants of record charge their percentage on the full amount the customer pays, tax included.

## Your share of one sale

| Sale | Stripe | Managed Payments | Polar | Lemon Squeezy | Paddle |
|---|---|---|---|---|---|
| $20 a month, US card | $18.98 | $18.28 | $18.50 | $18.40 | $18.50 |
| €20 a month with VAT, German card | $17.31 | $16.64 | $16.91 | $16.80 | $16.80 to $17.25 |
| $5 a month, US card | $4.52 | $4.34 | $4.25 | $4.22 | $4.25 |
| $99 a year, US card | $95.14 | $91.67 | $93.55 | $93.05 | $93.55 |

For the US rows, I assumed no sales tax on the sale. For the German row, I converted €20 at the European Central Bank's rate of October 19, 2026, to $22.45, of which $3.58 is the 19% VAT. The Stripe figure there includes Stripe Tax and leaves out the cost of filing the EU VAT return yourself. Paddle's range depends on whether it converts the whole sale to dollars at its 2% currency margin.

On 100 customers paying $20, a merchant of record costs you $48 to $58 a month more than Stripe. In exchange, the merchant of record registers for VAT and files the sales tax returns for those sales.

Fixed fees weigh most on small prices. At $5 a month, Polar and Paddle keep 15% of each sale, and Stripe keeps 9.6%. Lemon Squeezy and Paddle offer custom pricing for products under $10. With a yearly plan, you pay the fixed fee once instead of twelve times: $99 a year on Polar costs $5.45 in fees, against $10.95 for twelve monthly payments of $8.25.

## Refunds, disputes and payouts

Refunds, disputes and payouts also change the amount you receive:

- **Refunds.** Stripe, Polar and Lemon Squeezy keep their original fee when you refund a sale. Paddle's terms let it recover its fees on a refund without stating the amount.
- **Disputes.** Each one costs $15, or $20 on Paddle, and Paddle keeps the $20 whether it wins or loses. Stripe charges another $15 if you respond to the dispute, and returns that one when you win.
- **Payouts.** Stripe pays out every business day for free. [Polar](https://polar.sh/docs/features/finance/payouts) pays when you request a withdrawal, seven days after the sale for organizations created since May 12, 2026, and passes on Stripe's payout fees: $2 for each month with a payout, plus 0.25% + 25¢ per payout. Lemon Squeezy pays twice a month above $50, and Paddle once a month above $100.

## Lemon Squeezy since Stripe bought it

Stripe bought Lemon Squeezy in 2024. In a [January 2026 update](https://www.lemonsqueezy.com/blog/2026-update), the Lemon Squeezy team wrote that it is building Stripe Managed Payments and plans to give Lemon Squeezy users a way to move there. As of October 19, 2026, Lemon Squeezy takes new stores, and Stripe hasn't announced a date for it to close. If you start today, expect to move to Managed Payments at some point.

## Picking a provider

- **Most of your customers are in the US, or you're already registered for sales tax:** Stripe leaves you the most of each sale.
- **You sell to consumers in the EU or the UK and don't want to register for VAT:** a merchant of record. Paddle includes international cards and PayPal in its 5% + 50¢; Polar pays out faster and has cheaper plans once you sell more than about $1,400 a month.
- **You already run on Stripe and want it to handle tax:** Stripe Managed Payments, if you pass the eligibility review. Of the five, it leaves you the least on a $20 or $99 sale.
- **Your price is under $10:** the fixed fee takes a large share on all five. Sell yearly plans, or ask Paddle or Lemon Squeezy for custom pricing.

## Track what you keep

With any of the five, the payout in your bank is smaller than your sales. Record the sales, the fees and the refunds as separate lines in your books, and leave the tax a merchant of record collects out of your revenue. [How to get Stripe into QuickBooks or Xero](/blog/stripe-quickbooks-xero) shows the entries, and [Revenue vs profit](/blog/revenue-vs-profit-saas) shows where fees sit between your MRR and your profit.

OpenProfit reads Stripe, Polar, Paddle and Lemon Squeezy through their APIs and shows your revenue after fees and refunds, with sales tax and VAT kept apart, next to the costs of each app. If you switch providers, connect both, and OpenProfit puts the revenue from each on the same product.
