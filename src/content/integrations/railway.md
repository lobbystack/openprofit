---
title: Track Railway costs per project
name: Railway
kind: cost
summary: Monthly CPU, memory, egress, disk and backup usage per project.
description: See what each Railway project costs per month, priced from Railway's own usage data, next to the revenue of the product it runs.
---

# Track Railway costs per project

Railway bills a workspace for the resources its services use. OpenProfit reads that usage per project and prices it, so each product carries the cost of the servers it runs on.

## What it reads

Railway's API reports usage in resource units rather than dollars. OpenProfit asks for each project's usage per month and prices it at Railway's published rates:

| Resource | Rate |
| --- | --- |
| CPU | $20 per vCPU per month |
| Memory | $10 per GB per month |
| Network egress | $0.05 per GB |
| Volume storage | $0.15 per GB per month |
| Backups | $0.15 per GB per month |

Each billing period, Railway charges your plan's fee or your usage, whichever is higher: $5 on Hobby, $20 on Pro. When a period closes under the fee, OpenProfit adds the difference as **Plan minimum** lines, dated the day the period starts and split across your projects by their usage, so each product carries its share. Railway's API reports only your current plan, so OpenProfit writes that line in the week after a period closes and skips older periods.

Credits, discounts and domains aren't in the usage data, so the total can still differ from your invoice. Add a domain as a flat yearly cost.

## Connect it

1. In Railway, open **Account Settings → Tokens** and create an account token, or a workspace token for the workspace you want to read.
2. In OpenProfit, open **Connections → Railway** and paste it. With a workspace token, also paste the workspace id.
3. Press **Test**, then **Connect**. The first sync reads two years (one on the hosted Free plan) one month at a time, so it takes a few seconds.

## Costs per product

Each Railway project appears on the connection's page. Assign it to a product and its usage follows, past months included.
