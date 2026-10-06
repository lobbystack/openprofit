---
title: Track OpenAI costs per project
name: OpenAI
kind: cost
summary: Daily spend by project and line item, from OpenAI's own billing data.
description: See your OpenAI API spend by day, by project and by model, next to the revenue each product brings in. Connect with an admin key in two minutes.
---

# Track OpenAI costs per project

OpenAI's usage page shows what your organization spent. It doesn't show which of your products spent it, or whether that product makes enough to cover the bill. OpenProfit pulls your OpenAI costs every hour, splits them by project, and puts them next to the revenue of the product each project serves.

## What it reads

OpenProfit calls OpenAI's organization costs API, the same data behind the usage dashboard. For each day it records:

- the amount, in the currency OpenAI bills you;
- the project that incurred it;
- the line item, such as a model's input tokens, output tokens, cached input or embeddings.

The first sync goes back two years. After that, every sync rereads the last three days, so late adjustments from OpenAI replace the earlier figure instead of adding to it.

## Connect it

1. In the OpenAI platform, open **Settings → Organization → Admin keys** and create a key. Only organization owners can create one.
2. In OpenProfit, open **Connections → OpenAI**, paste the key and press **Test**. The test shows your organization's name.
3. Press **Connect**. The overview fills in once the first sync finishes.

The key is stored encrypted and used only to read costs.

## Costs per product

Each OpenAI project appears on the connection's page with this month's spend. Point a project at the product it serves, and its costs land on that product from then on, history included. Projects you leave unassigned stay in a shared bucket until you decide. If you run one product, everything goes to it by default.

Three products on one OpenAI account, one project each, and you see which one pays for its tokens.

## Common questions

**Why don't the numbers match the usage page to the cent?** OpenAI finalizes some charges a day or two later. OpenProfit rereads recent days on every sync, so the totals converge.

**Can I use a regular API key?** No. The costs endpoint needs an admin key.
