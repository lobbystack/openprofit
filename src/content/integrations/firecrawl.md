---
title: Track Firecrawl costs per API key
name: Firecrawl
kind: cost
summary: Plan fee and extra credits per billing period, split by API key.
description: See what each Firecrawl API key costs per billing period, estimated from credit usage and Firecrawl's published prices, next to the revenue of the product it serves.
---

# Track Firecrawl costs per API key

Firecrawl bills a team for a plan with a monthly credit allotment, plus extra credits once the allotment runs out. OpenProfit reads the credits each API key used and prices them, so each product carries the scraping it does.

## What it reads

Firecrawl's API reports credits, not dollars. OpenProfit reads your plan's monthly credits and the credits each API key used per billing period. It prices them at Firecrawl's published rates:

| Plan | Credits a month | Monthly billing | Yearly billing | Extra credits per $5 |
| --- | --- | --- | --- | --- |
| Free | 1,000 | $0 | $0 | Not available |
| Hobby | 5,000 | $19 | $190 a year | 1,000 |
| Standard | 100,000 | $99 | $990 a year | 2,000 |
| Growth | 500,000 | $399 | $3,990 a year | 2,500 |
| Scale | 1,000,000 | $749 | $7,190 a year | 5,000 |

Each billing period gets two costs:

- **Plan**: the monthly price, or a twelfth of the yearly price
- **Extra credits**: credits used above the allotment, rounded up to whole $5 packs

Both costs split across your API keys by their share of the period's credits. A period without usage puts the plan fee on the connection. These figures are estimates, so your invoice can differ. Coupon and bought credits count as extra credits.

OpenProfit prices the current billing period at your current plan. A period keeps the cost it had when it closed, so a later plan change doesn't reprice it. History starts with the billing period you connect in, because OpenProfit can't tell which plan you had before.

## Connect it

1. In Firecrawl, open **API Keys** and copy a key. Any key on the team works, restricted keys included. Firecrawl has no read-only key.
2. In OpenProfit, open **Connections → Firecrawl** and paste it.
3. Leave **Plan** on **Detect automatically**. OpenProfit matches the plan by its monthly credits. Pick a plan only if the detected one is wrong.
4. Set **Billing** to **Yearly** if you pay for a year at a time.
5. Press **Test**, then **Connect**.

Enterprise plans have custom credits and prices, so the test fails with the credits Firecrawl reports. Pick the closest plan, or skip the connector and add your contract on the **Costs** page as a flat amount.

## Costs per product

Each API key appears on the connection's page under its name in Firecrawl. Assign it to a product and its costs follow, past periods included. OpenProfit tracks keys by name, so renaming a key starts a new one. The billing period you rename it in counts that key under both names.
