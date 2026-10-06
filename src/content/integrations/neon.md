---
title: Track Neon costs per project
name: Neon
kind: cost
summary: Monthly compute, storage, transfer and branch usage per project, priced at Neon's published rates.
description: See what each Neon Postgres project costs per month, estimated from Neon's usage data, next to the revenue of the product it serves.
---

# Track Neon costs per project

Neon bills an organization for the compute, storage and transfer its projects use. OpenProfit reads that usage per project and prices it, so each product carries the cost of its database.

## What it reads

Neon's consumption API reports usage, not dollars, so these figures are estimates. OpenProfit reads each project's usage per month and prices it at Neon's published rates for your plan:

| Usage | Launch | Scale |
| --- | --- | --- |
| Compute | $0.106 per CU-hour | $0.222 per CU-hour |
| Root and child branch storage | $0.35 per GB-month | $0.35 per GB-month |
| Instant restore history | $0.20 per GB-month | $0.20 per GB-month |
| Snapshots | $0.09 per GB-month | $0.09 per GB-month |
| Public transfer | $0.10 per GB over 500 GB per project | $0.10 per GB over 500 GB per project |
| Private transfer | Not on Launch | $0.01 per GB |
| Extra branches | $1.50 per branch-month over 10 per project | $1.50 per branch-month over 25 per project |

A compute unit (CU) is one vCPU with 4 GB of RAM. Neon's paid plans have no monthly minimum. Business and Enterprise plans use the Scale rates here. Negotiated prices, credits, and Neon Auth, Functions or Object Storage charges aren't part of this data, so the total can differ from your invoice.

Neon keeps monthly usage for one year, so the first sync reads at most the last 12 months. Every sync rereads the current month.

On the Free plan Neon doesn't bill you and has no usage history. The connection tests fine and shows no costs until you upgrade.

## Connect it

1. In the Neon Console, switch to your organization and open **Settings → API keys**. Create an organization API key. Only organization admins can create one, and Neon has no read-only keys.
2. In OpenProfit, open **Connections → Neon** and paste the key. With a personal API key that belongs to more than one paid organization, also paste the organization id.
3. Press **Test**, then **Connect**.

## Costs per product

Each Neon project appears on the connection's page under its project id. Assign it to a product and its costs follow, past months included.
