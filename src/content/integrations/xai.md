---
title: Track xAI API costs
name: xAI
kind: cost
summary: Daily Grok API spend by model and billing item, from xAI's usage data.
description: See what your Grok API calls cost each day, by model, next to the revenue of the product that makes them. Connect with an xAI management key.
---

# Track xAI API costs

xAI deducts every Grok API call from your team's prepaid credits or adds it to your monthly invoice. OpenProfit reads what each day's calls cost and puts it next to the revenue of the product that makes them.

## What it reads

OpenProfit calls the usage endpoint of xAI's Management API. For each day it records:

- the amount in US dollars
- the billing description, such as `Chat grok-4-0709` or an image model

Credit purchases and auto top-ups don't count as costs: prepay $100, spend $40, and OpenProfit shows $40. The first sync goes back two years (one on the hosted Free plan), or to the oldest day xAI returns, and later syncs reread the last three days.

## Connect it

1. In the xAI Console, open **Settings → Management Keys** and create a key. Your account needs the Management Keys permission; a team admin can grant it on the **Users** page. A management key is separate from the API keys your app uses.
2. In OpenProfit, open **Connections → xAI** and paste the key. Leave the team id empty: OpenProfit reads it from the key. Fill it in only if xAI issued the key for a whole organization.
3. Press **Test**, then **Connect**.

## Costs per product

xAI's API documents grouping usage by billing description only, so all xAI costs go to the product you pick at the top of the connection's page. If two products share one team, give each its own xAI team and connect both.
