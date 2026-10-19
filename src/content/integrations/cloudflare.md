---
title: Cloudflare usage and costs by zone
name: Cloudflare
kind: cost
summary: Billable usage, or invoices where usage isn't available.
description: Your Cloudflare Workers, R2 and other usage costs by day and zone, next to the revenue of each product. Connect with a read-only API token.
---

# Track Cloudflare costs

Cloudflare shows usage costs under **Manage Account → Billing → Billable Usage**, by product, for the whole account. OpenProfit reads that usage through Cloudflare's API, splits it by zone, and sets each zone's costs against the revenue of the product it serves.

## What it reads

OpenProfit first asks for billable usage. For each day it records:

- the amount, in the currency Cloudflare bills you;
- the Cloudflare service the usage belongs to;
- the zone, when Cloudflare attributes the usage to one.

Cloudflare updates this data once a day, and its total for a closed billing period matches the usage charges on that period's invoice.

The API covers self-serve accounts. When Cloudflare refuses the request, OpenProfit reads the account's billing history instead: one line per entry, dated the day Cloudflare charged it, with no zone. The first sync asks for two years, or one year on the hosted Free plan.

## Connect it

1. In the Cloudflare dashboard, open **My Profile → API Tokens**, click **Create Token** and start a custom token.
2. Add two permissions: **Account · Billing · Read** and **Account · Account Settings · Read**.
3. Under **Account Resources**, include only the account you want to read.
4. In OpenProfit, open **Connections → Cloudflare** and paste the token. Skip the account id when the token covers one account.
5. Press **Test**, then **Connect**. The test shows the account's name.

The token can read billing but can't change anything.

## Costs per product

Each zone with usage this month appears on the connection's page with its spend. Assign a zone to a product and its costs follow, past days included. Usage outside any zone, and every line from billing history, sits in a **Not in a zone** row. That row follows the product you pick for it, or stays under Unassigned.

The sample stack in [the monthly cost of running a SaaS](/blog/saas-running-costs) runs DNS on Cloudflare's free plan. [Connecting providers](/docs/connectors) covers sync timing and flat costs.

## Common questions

**Why don't my plan or domain show up?** Billable usage covers usage charges, and a zone plan or domain renewal isn't usage. Add it as a flat cost on the **Costs** page.

**Can I use an account API token?** No. OpenProfit checks the token against Cloudflare's user token endpoint, so create it under **My Profile → API Tokens**.
