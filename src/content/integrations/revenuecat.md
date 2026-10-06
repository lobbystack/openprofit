---
title: RevenueCat revenue, proceeds and MRR
name: RevenueCat
kind: revenue
summary: Monthly revenue and proceeds after store commission, MRR and active subscriptions.
description: Bring your App Store, Google Play and other RevenueCat revenue, after taxes and store commission, into one view with your costs.
---

# RevenueCat revenue, proceeds and MRR

RevenueCat tracks in-app purchases across the App Store, Google Play and the other stores your app sells through. OpenProfit reads RevenueCat's revenue figures for your project and sets them against what the app costs to run.

## What it reads

OpenProfit reads RevenueCat's metrics for the project your key belongs to:

- **Revenue, net of taxes:** what customers paid, minus taxes and refunds.
- **Proceeds:** revenue net of taxes, minus the store's commission. The commission shows as the fee.
- **Revenue:** what customers paid. Revenue minus revenue net of taxes is the tax, which shows as **Tax collected** on the overview. The App Store and Google Play file the tax on their sales, and you file it for RevenueCat Web Billing sales. RevenueCat's metrics can't split tax by store, so the overview counts all of it as yours to file.
- **Overview:** monthly recurring revenue (MRR) and active subscriptions.

Taxes and commission are RevenueCat's estimates and can differ from the store's payout report. RevenueCat subtracts refunds in the month it processes them.

RevenueCat limits its metrics API to 25 requests a minute, so OpenProfit reads revenue one month at a time. The first sync covers two years, or one year on the hosted Free plan, and takes about three minutes. Amounts come in your project's currency and convert to your base currency at the European Central Bank rate.

## Avoid counting Stripe or Paddle twice

RevenueCat also records web purchases from Stripe, Paddle and RevenueCat Web Billing, which charges through your Stripe account. If you connect Stripe or Paddle to OpenProfit too, those sales appear in both connections and count twice. RevenueCat's API returns one revenue total per project and can't leave a store out.

Pick one source for web sales. Either skip the Stripe or Paddle connection, or keep web sales in a separate RevenueCat project and connect only your app's project.

## Connect it

1. In RevenueCat, open your project's settings, then **API keys**, and create a secret API key. Choose **V2** as the version and give it two read permissions: `project_configuration:projects:read` and `charts_metrics:overview:read`.
2. In OpenProfit, open **Connections → RevenueCat**, paste the key and press **Test**. The test shows your project's name.
3. Press **Connect**.

## Revenue per product

RevenueCat revenue goes to the product you pick on the connection's page. A secret key belongs to one project, so connect one key per app if you run several.
