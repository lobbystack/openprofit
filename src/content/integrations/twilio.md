---
title: Track Twilio costs per day
name: Twilio
kind: cost
summary: Daily total usage cost, subaccounts included, from Twilio's usage records.
description: See what Twilio charges you per day for messages, calls and numbers, next to the revenue of the product that sends them.
---

# Track Twilio costs per day

Twilio charges per message, minute and phone number, and its usage records split that spend into dozens of categories. OpenProfit reads one daily total and puts it next to the revenue of the product that sends those messages.

## What it reads

OpenProfit reads Twilio's daily usage records in the `totalprice` category. Each day becomes one cost line, labeled **Usage**, with the price of all usage on the account and its subaccounts, in the currency Twilio bills you.

The other categories overlap (`calls` contains `calls-inbound`), and some costs sit in no category. Adding categories up counts some charges twice and misses others.

Twilio dates usage records by GMT day, and OpenProfit keeps those dates, so a California evening's usage can land on the next day.

The first sync reads up to two years of records, or one year on the hosted Free plan. Every later sync rereads the last three days, so a revised day replaces the earlier figure.

## Connect it

1. In the Twilio Console, open **Settings → Account settings → API keys & auth tokens**.
2. Select the **United States (US1)** region and click **Create API key**. A key works only in the region you created it in, and OpenProfit calls US1.
3. Pick **Restricted** as the key type. Under **Permissions**, grant `/twilio/billing/usage/read` and nothing else.
4. Copy the key's SID and secret before you click **Finish**.
5. In OpenProfit, open **Connections → Twilio** and paste your Account SID, the key's SID and its secret.
6. Press **Test**, then **Connect**. A usage-only key can't read the account's name, so the test shows a shortened Account SID.

## Costs per product

Twilio reports one total per day. Pick the product it serves at the top of the connection's page, and every day moves to that product, history included. If your workspace has one product, the connection starts on it.

[The monthly cost of running a SaaS](/blog/saas-running-costs) prices the rest of a typical stack, from hosting to payment fees. [Connecting providers](/docs/connectors) covers sync timing and costs that have no API.

## Common questions

**Does it include subaccounts?** Yes. Twilio's usage records include every subaccount by default, and OpenProfit reads them through the main account.

**Can I split one Twilio account between two products?** No. The daily total has no breakdown by app, so a connection goes to one product or stays Unassigned.
