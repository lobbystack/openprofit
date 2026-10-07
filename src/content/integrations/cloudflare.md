---
title: Track Cloudflare costs
name: Cloudflare
kind: cost
summary: Billable usage, or invoices where usage isn't available.
description: Bring your Cloudflare Workers, R2 and plan charges into the same view as your revenue. Connect with a read-only API token.
---

# Track Cloudflare costs

Workers, R2, Images and the zone plans each bill separately on Cloudflare. OpenProfit reads them through the API and adds them to your costs, per day where Cloudflare reports usage, per invoice where it doesn't.

## What it reads

OpenProfit first asks for billable usage, which gives daily amounts per product. Some accounts don't expose usage through the API; for those it reads billing history instead, one line per invoice item.

## Connect it

1. In the Cloudflare dashboard, open **My Profile → API Tokens** and create a custom token with two permissions: **Account · Billing · Read** and **Account · Account Settings · Read**.
2. In OpenProfit, open **Connections → Cloudflare** and paste the token. Add the account id if the token can see more than one account.
3. Press **Test**, then **Connect**.

The token can read billing and account names. It can't change anything.

## Costs per product

Where Cloudflare attributes usage to a zone, the zone appears on the connection's page and you assign it to a product. Account-wide charges stay under Unassigned.
