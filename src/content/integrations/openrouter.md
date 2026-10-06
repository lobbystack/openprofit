---
title: Track OpenRouter costs per API key
name: OpenRouter
kind: cost
summary: Daily spend by API key and model for the last 30 days.
description: See what you spend on OpenRouter per day, by API key and model, next to the revenue of the product each key serves.
---

# Track OpenRouter costs per API key

OpenRouter bills one credit balance for every model you call. OpenProfit splits that spend by API key and model, so each product carries the cost of its own tokens.

## What it reads

OpenProfit reads OpenRouter's activity API. For each completed UTC day it records:

- the credits spent, in US dollars;
- the model, such as `openai/gpt-4.1`;
- the API key that made the requests.

Bring-your-own-key (BYOK) usage stays out: your own provider bills it, and that provider's connector counts it. Activity from keys outside your default workspace, or from deleted keys, appears without a key.

OpenRouter keeps activity for 30 days, so your history starts 30 days before you connect. Today shows up after the UTC day closes.

To keep the number of requests down, OpenProfit reads per-key activity only for keys that spent this UTC month. Early in a month, a key that hasn't spent yet shows its spend from the end of last month without a key, until it spends again.

## The key it needs

OpenRouter serves activity only to management keys, and offers no read-only variant. A management key can create, edit and delete the API keys on your account. OpenProfit only reads activity and the list of keys, and stores the key encrypted.

## Connect it

1. In OpenRouter, open [Settings → Management Keys](https://openrouter.ai/settings/management-keys) and create a key. Only organization admins can create one.
2. In OpenProfit, open **Connections → OpenRouter**, paste the key and press **Test**.
3. Press **Connect**.

## Costs per product

Each API key with spend appears on the connection's page under the hash OpenRouter's API uses to identify it. Assign a key to a product and its costs follow, past days included. Activity without a key stays in the shared bucket.
