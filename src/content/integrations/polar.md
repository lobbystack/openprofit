---
title: Polar revenue, MRR and subscriptions
name: Polar
kind: revenue
summary: Daily revenue and net revenue, MRR and active subscriptions.
description: Bring your Polar revenue, net of Polar's fees, into one view with your costs. Connect with an organization access token.
---

# Polar revenue, MRR and subscriptions

Polar handles your checkout and tax as merchant of record. OpenProfit reads what you earned through it and puts it next to what the product costs to run.

## What it reads

OpenProfit reads Polar's metrics for your organization:

- daily revenue and net revenue, so Polar's fee is the difference between the two;
- monthly recurring revenue;
- active subscriptions.

Polar's revenue leaves tax out, and its metrics don't report the tax, so Polar adds nothing to **Tax collected** on the overview. Polar files that tax for you.

The first sync goes back two years, or one year on the hosted Free plan.

## Connect it

1. In Polar, open your organization's **Settings → Developers** and create an organization access token with two scopes: `organizations:read` and `metrics:read`. Pick the longest expiry; when a token expires, syncing stops.
2. In OpenProfit, open **Connections → Polar**, paste the token and press **Test**. The test shows your organization's name.
3. Press **Connect**.

## Revenue per product

Polar revenue goes to the product you pick on the connection's page. One Polar organization per product keeps the split exact.
