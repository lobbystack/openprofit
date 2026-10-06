---
title: Track Twilio costs per day
name: Twilio
kind: cost
summary: Daily total usage cost, subaccounts included, from Twilio's usage records.
description: See what Twilio charges you per day for messages, calls and numbers, next to the revenue of the product that sends them.
---

# Track Twilio costs per day

Twilio charges per message, minute and phone number. OpenProfit reads the daily total and puts it next to the revenue of the product that sends those messages.

## What it reads

OpenProfit reads Twilio's daily usage records in the total price category. For each day it records the cost of all usage on the account and its subaccounts, in the currency Twilio bills you.

Twilio's other usage categories overlap, so adding them up counts some costs twice. The total price category avoids that and includes costs that sit in no other category.

## Connect it

1. In the Twilio Console, open **Account settings → API keys & auth tokens** and create an API key. Pick **Restricted** as the key type.
2. Under **Permissions**, grant `/twilio/billing/usage/read` and nothing else.
3. In OpenProfit, open **Connections → Twilio** and paste your Account SID, the key's SID and its secret.
4. Press **Test**, then **Connect**.

## Costs per product

Twilio reports one total per day. Pick the product it serves at the top of the connection's page and every day goes to it. If several products share the account, the total stays in the shared bucket.
