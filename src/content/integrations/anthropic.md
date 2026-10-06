---
title: Track Anthropic costs per workspace
name: Anthropic
kind: cost
summary: Daily spend by workspace and model from the Claude API's cost report.
description: See your Claude API spend by day and by workspace, assigned to the products that use it. Connect with an Anthropic admin key.
---

# Track Anthropic costs per workspace

The Claude Console shows what your organization spent on the API. OpenProfit takes the same numbers, splits them by workspace, and sets them against the revenue of the product each workspace serves, so you see the margin, not just the bill.

## What it reads

OpenProfit reads Anthropic's cost report through the Admin API. For each day it records:

- the amount, in the currency Anthropic bills you;
- the workspace that incurred it;
- the description Anthropic gives the charge, such as the model and token type.

The first sync goes back two years, or one year on the hosted Free plan. Every later sync rereads the last three days so corrections replace earlier figures.

## Connect it

1. In the Claude Console, open **Settings → Admin keys** and create a key. Admin keys exist only on organization accounts; individual accounts can't create them.
2. In OpenProfit, open **Connections → Anthropic**, paste the key and press **Test**. The test shows your organization's name.
3. Press **Connect**.

The key is stored encrypted and used only to read the cost report.

## Costs per product

Workspaces are how Anthropic groups usage, so they're how OpenProfit maps it. Give each product its own workspace and its own API key, then assign the workspace to the product on the connection's page. Unassigned workspaces stay in a shared bucket.

## Common questions

**I use Claude through AWS Bedrock or Google Vertex.** Those charges appear on your AWS or Google Cloud bill, not in Anthropic's cost report. Add them as a flat monthly cost until a connector for those clouds exists.
