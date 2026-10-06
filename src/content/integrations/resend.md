---
title: Track Resend costs per sending domain
name: Resend
kind: cost
summary: Monthly transactional email cost per sending domain.
description: See what each sending domain costs on Resend per month, estimated from email volume and Resend's published prices, next to the revenue of the product it sends for.
---

# Track Resend costs per sending domain

Resend bills transactional email by monthly volume: a plan fee covers a set number of emails, and each 1,000 after that costs extra. OpenProfit reads how many emails each sending domain sent and prices them, so each product carries the email it sends.

## What it reads

Resend's API reports email counts, not dollars. OpenProfit counts the emails Resend accepted from each sending domain per month, leaves out broadcasts, and prices the month at Resend's published rates:

| Plan | Price a month | Emails a month | Per 1,000 extra |
| --- | --- | --- | --- |
| Free | $0 | 3,000 | Not available |
| Pro | $20 | 50,000 | $0.90 |
| Pro | $35 | 100,000 | $0.90 |
| Scale | $90 | 100,000 | $0.90 |
| Scale | $160 | 200,000 | $0.80 |
| Scale | $350 | 500,000 | $0.70 |
| Scale | $650 | 1,000,000 | $0.65 |
| Scale | $825 | 1,500,000 | $0.52 |
| Scale | $1,150 | 2,500,000 | $0.46 |

The month's cost splits across your domains by their share of its emails. These figures are estimates, so your invoice can differ.

With **Detect automatically**, OpenProfit prices each month at the cheapest plan that could have sent that volume. Free counts only when the month stayed under 3,000 emails and every day under 100. If you pay for a bigger plan than your volume needs, pick it under **Plan** and OpenProfit charges its fee every month, even months with no email.

These costs don't come through the API, so add them on the **Costs** page as flat amounts:

- Marketing plans, which Resend prices by contacts
- Dedicated IPs, the domains add-on and single sign-on (SSO)
- Enterprise contracts

History goes back as far as your plan keeps data. Resend keeps 30 days on the Free plan, so OpenProfit skips any month that started before the oldest day Resend returns.

## Connect it

1. In Resend, open **API Keys** and create a key with **Full access**. A sending access key can't read metrics. Resend has no read-only key, so this key can also send email.
2. In OpenProfit, open **Connections → Resend** and paste it.
3. Leave **Plan** on **Detect automatically**, or pick the plan you pay for.
4. Press **Test**, then **Connect**.

Resend updates its counts up to 15 minutes late, so the current month can trail your dashboard by that much.

## Costs per product

Each sending domain appears on the connection's page. Assign it to a product and its email costs follow, past months included. Emails without a domain go to the product picked at the top of the same page.
