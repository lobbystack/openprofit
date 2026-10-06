---
title: Track GitHub costs per repository
name: GitHub
kind: cost
summary: Daily Actions, Copilot, Packages and storage charges by repository.
description: See what GitHub charges you per day for Actions minutes, Copilot, Packages and storage, by repository, next to the revenue of each product.
---

# Track GitHub costs per repository

GitHub bills Actions minutes, Copilot, Packages and storage on one invoice. OpenProfit reads that usage per day and per repository, so CI minutes land on the product they build.

## What it reads

OpenProfit reads the usage report from GitHub's billing API, for an organization or for your personal account. For each day it records:

- the net amount in US dollars, after included minutes and other discounts;
- the SKU, such as Actions Linux;
- the repository, when GitHub attributes the usage to one.

The usage report exists only on GitHub's enhanced billing platform. Accounts still on the old billing pages get an error when you press **Test**.

## Connect it

1. On GitHub, open **Settings → Developer settings → Fine-grained tokens** and generate a new token.
2. For an organization, set the resource owner to the organization and give **Administration** read-only access under organization permissions. You must be an owner or billing manager of that organization.
3. For your personal account, keep yourself as the resource owner and give **Plan** read-only access under account permissions.
4. In OpenProfit, open **Connections → GitHub**, paste the token and, for an organization, its name. Press **Test**, then **Connect**.

## Costs per product

Each repository with charges appears on the connection's page. Assign it to a product and its costs follow, past days included. Charges GitHub doesn't tie to a repository stay in the shared bucket.

## Common questions

**Why is a day at zero?** OpenProfit records the net amount. Usage inside your plan's included minutes and storage costs nothing, so those days stay empty.
