---
title: OpenAI usage dashboard by project
name: OpenAI
kind: cost
summary: Daily spend by project and line item, from OpenAI's own billing data.
description: Your OpenAI API usage and billing by day, project and model, next to the revenue each product brings in. Connect with an admin key in two minutes.
---

# OpenAI usage dashboard by project

OpenAI's own numbers are on the **Usage** page of the OpenAI platform, and billing is under **Settings → Organization → Billing**. Organization owners and members with the Usage Dashboard permission can open both.

The usage dashboard filters by project. It doesn't show the revenue of the product each project serves, or your other bills. OpenProfit reads your OpenAI costs on every sync, splits them by project, and puts them next to that revenue and the rest of your costs.

## What it reads

OpenProfit calls OpenAI's organization costs API, the same data behind the usage dashboard. For each day it records:

- the amount, in the currency OpenAI bills you;
- the project that incurred it;
- the line item, such as a model's input tokens, output tokens, cached input or embeddings.

The first sync goes back two years, or one year on the hosted Free plan. After that, every sync rereads the last three days, so late adjustments from OpenAI replace the earlier figure instead of adding to it.

## Connect it

1. In the OpenAI platform, open **Settings → Organization → Admin keys** and create a key. Only organization owners can create one.
2. In OpenProfit, open **Connections → OpenAI**, paste the key and press **Test**. The test shows your organization's name.
3. Press **Connect**. The overview fills in once the first sync finishes.

The key is stored encrypted and used only to read costs.

## Costs per product

Each OpenAI project appears on the connection's page with this month's spend. Point a project at the product it serves, and its costs land on that product from then on, history included. Projects you leave unassigned stay under Unassigned until you decide. If you run one product, everything goes to it by default.

Three products on one OpenAI account, one project each, and you see which one pays for its tokens.

## Common questions

**Why don't the numbers match the usage page to the cent?** OpenAI finalizes some charges a day or two later. OpenProfit rereads recent days on every sync, so the totals converge.

**Can I use a regular API key?** No. The costs endpoint needs an admin key.
