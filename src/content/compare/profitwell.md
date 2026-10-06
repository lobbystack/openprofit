---
title: OpenProfit vs ProfitWell Metrics
description: ProfitWell Metrics tracks subscription revenue for free. OpenProfit adds your costs, from AI providers to hosting, and shows profit per product. Here's how they differ.
---

# OpenProfit vs ProfitWell Metrics

ProfitWell Metrics, now part of Paddle, is free subscription revenue reporting: MRR, churn, upgrades, lifetime value. OpenProfit answers a different question. It puts your revenue next to every bill you pay and shows what each product keeps.

If you only need revenue metrics, ProfitWell Metrics is free and mature. If you want to know whether a product is profitable after its OpenAI, Vercel and Railway bills, that's what OpenProfit is for.

## At a glance

| | ProfitWell Metrics | OpenProfit |
| --- | --- | --- |
| Price | Free | Free under $2,500 MRR, then $19 or $49 a month. Free to self-host |
| Revenue sources | Stripe, Braintree, Chargebee, Recurly, Zuora, Maxio, Recharge, Paddle Billing | Stripe, Polar, Paddle, Lemon Squeezy, RevenueCat (App Store and Google Play) |
| Costs | Not listed | 14 providers, from OpenAI to MongoDB Atlas, plus flat costs |
| Profit and margin | Not listed | Per product |
| Subscription metrics | MRR, churn, LTV, upgrades and downgrades, cohorts | MRR and active subscriptions |
| Open source | Not listed | MIT licensed |
| Self-hosting | Not listed | One Docker container |

## Where ProfitWell Metrics is stronger

- **Subscription analytics depth.** Churn breakdowns, cohorts and lifetime value go well beyond the MRR and subscription count OpenProfit shows.
- **Billing system coverage.** It reads from most subscription billing tools, including Paddle's own.
- **Price.** It costs nothing at any size.

## Where OpenProfit is different

- **Costs come in automatically.** OpenProfit reads the billing APIs of your AI providers and hosting, by day and by project.
- **Profit per product.** Map an OpenAI project or a Vercel project to the product it serves, and each product shows its own margin.
- **You can run it yourself.** The code is on GitHub under the MIT license, and the hosted version runs the same image.

## Can I use both?

Yes. Keep ProfitWell Metrics for churn and cohorts, and use OpenProfit for costs and the profit number.

<small>Facts about ProfitWell Metrics come from [paddle.com/profitwell-metrics](https://www.paddle.com/profitwell-metrics) and Paddle's [help center](https://www.paddle.com/help/profitwell-metrics/setup/get-started/adding-data-to-profit-well-manually), as of October 2026. ProfitWell and Paddle are trademarks of their owners.</small>
