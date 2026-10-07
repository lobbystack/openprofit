---
title: Claude API usage and costs by workspace
name: Anthropic
kind: cost
summary: Daily spend by workspace and model from the Claude API's cost report.
description: Your Claude API usage and costs by day, workspace and model, next to the revenue of the product each workspace serves. Connect with an Anthropic admin key.
---

# Claude API usage and costs by workspace

Anthropic's own numbers are in the Claude Console at platform.claude.com. The **Usage** page shows tokens by model, workspace and API key, and the **Cost** page shows spend by workspace and model. Members with the Developer, Billing or Admin role can see both.

Neither page shows what a workspace's product earns. OpenProfit reads the same cost report, splits it by workspace, and sets it against the revenue of the product each workspace serves, so you see its margin.

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

Workspaces are how Anthropic groups usage, so they're how OpenProfit maps it. Give each product its own workspace and its own API key, then assign the workspace to the product on the connection's page. Unassigned workspaces stay under Unassigned.

## Common questions

**I use Claude through AWS Bedrock or Google Vertex.** Those charges appear on your AWS or Google Cloud bill, not in Anthropic's cost report. Add them as a flat monthly cost until a connector for those clouds exists.
