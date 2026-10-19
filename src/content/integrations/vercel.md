---
title: Vercel usage and costs by project
name: Vercel
kind: cost
summary: Daily charges per project, read from Vercel's billing API.
description: Your Vercel usage and costs by day and project, from functions to bandwidth, next to the revenue of the product each project hosts.
---

# Track Vercel costs per project

A Vercel invoice is one number for the whole team. OpenProfit breaks it down by project and day, so the product with the expensive functions shows up as the product with the thin margin.

## What it reads

OpenProfit reads Vercel's billing charges API, which returns each day's charges in FOCUS, an open format for cloud cost data. For each charge it records:

- the day and the amount billed, in US dollars;
- the service Vercel names on the charge;
- the project, from the project id and name Vercel tags the charge with.

Every charge with a nonzero amount counts, whatever its category: usage, purchases, taxes, credits or adjustments. Each sync after the first rereads the last three days, so a revised day replaces the earlier figure.

## Connect it

1. In Vercel, open the **Account Tokens** page in your personal account's settings.
2. Name the token. Under **Scope**, pick the team, then **All Projects**. A token scoped to one project can't read team-level data such as billing.
3. Choose an expiration, click **Create** and copy the token.
4. In OpenProfit, open **Connections → Vercel** and paste it. Leave the team id empty to read your default team, or paste the id from the team's settings.
5. Press **Test**, then **Connect**. The test shows your username and the team id.

Your team role must be one that can read billing: Owner, Member, Developer, Security, Billing or Enterprise Viewer.

## Costs per product

Each project with charges this month appears on the connection's page. Assign it to a product and its costs follow, past days included. Charges without a project tag sit in a **Not in a project** row, which follows the product you pick for it or stays under Unassigned.

In [the monthly cost of running a SaaS](/blog/saas-running-costs), Vercel Pro costs $20 a month at 100 customers and $40 at 1,000. [Connecting providers](/docs/connectors) covers sync timing and flat costs.

## Common questions

**Does it work on the Hobby plan?** Hobby is free and has no billing cycle, so there are no charges to read. Connect the team once it moves to a paid plan.

**Can OpenProfit stop a runaway Vercel bill?** No, it reads charges after Vercel records them. To cap spend, turn on **Pause Production Deployments** under **Settings → Billing → Spend Management**. [Spend limits vs budget alerts](/blog/spend-limits-budget-alerts) covers what to set.
