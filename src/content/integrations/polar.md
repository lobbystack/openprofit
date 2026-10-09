---
title: Polar revenue, MRR and subscriptions
name: Polar
kind: revenue
summary: Paid orders and refunds, MRR and active subscriptions.
description: Bring your Polar revenue, net of Polar's fees and refunds, into one view with your costs. Connect with an organization access token.
---

# Polar revenue, MRR and subscriptions

Polar handles your checkout and tax as merchant of record. OpenProfit reads what you earned through it and puts it next to what the product costs to run.

## What it reads

OpenProfit reads three things from your Polar organization:

- **Paid orders:** the price after discounts and before tax, the tax, and Polar's fee, on the day Polar created the order. A renewal keeps its date when a retry pays it later.
- **Refunds:** each one subtracts its amount before tax, and the tax it returns, on the day you made it. Polar keeps its fee.
- **Metrics:** monthly recurring revenue (MRR) and active subscriptions.

The tax shows as **Tax collected** on the overview, kept apart from revenue. Polar files it, so you don't owe it.

Orders stay in the currency the customer paid in and convert to your base currency at the European Central Bank rate for that day. A workspace in Canadian dollars uses the Bank of Canada's rate instead. The first sync goes back two years, or one year on the hosted Free plan. Polar retries a failed renewal for up to 21 days, so each sync rereads 21 days of orders.

## Connect it

1. In Polar, open your organization's **Settings → Developers** and create an organization access token with four scopes: `organizations:read`, `metrics:read`, `orders:read` and `refunds:read`. Pick the longest expiry; when a token expires, syncing stops.
2. In OpenProfit, open **Connections → Polar**, paste the token and press **Test**. The test shows your organization's name.
3. Press **Connect**.

A token with only `organizations:read` and `metrics:read` still syncs Polar's daily revenue and net revenue, without tax or refunds. To read orders, remove the connection and connect a token with all four scopes.

## Revenue per product

Polar revenue goes to the product you pick on the connection's page. One Polar organization per product keeps the split exact.
