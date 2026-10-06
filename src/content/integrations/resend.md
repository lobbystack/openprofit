---
title: Track Resend costs per sending domain
name: Resend
kind: cost
summary: Daily transactional email cost per sending domain, priced at your plan.
description: See what each sending domain costs on Resend, estimated from email volume and Resend's published prices, next to the revenue of the product it sends for.
---

# Track Resend costs per sending domain

Resend bills transactional email by monthly volume: a plan fee covers a set number of emails, and each 1,000 after that costs extra. OpenProfit reads how many emails each sending domain sent and prices them, so each product carries the email it sends.

## What it reads

Resend's API reports email counts, not dollars. OpenProfit counts the emails Resend accepted from each sending domain per day, leaves out broadcasts, and prices them at the published rates of the plan you pick:

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

Each day gets two parts:

- **Plan fee**: the monthly price divided by the days in the month, so the current month shows the fee up to today. Months with no email still carry the fee
- **Overage**: once the month's emails pass the plan's volume, the extra emails of each day at the plan's rate per 1,000

A day's cost splits across your domains by their share of that day's emails. A day without email puts its fee on the connection. These figures are estimates, so your invoice can differ.

These costs don't come through the API, so add them on the **Costs** page as flat amounts:

- Marketing plans, which Resend prices by contacts
- Dedicated IPs, the domains add-on and single sign-on (SSO)
- Enterprise contracts

History starts 30 days before you connect, because Resend keeps 30 days of data. OpenProfit keeps the days it already recorded after Resend drops them. When a month's first days fall out of those 30 days, its overage counts only the days Resend still returns, which matters only in a month that went over your plan's volume.

## Connect it

1. In Resend, open **API Keys** and create a key with **Full access**. A sending access key can't read metrics. Resend has no read-only key, so this key can also send email.
2. In OpenProfit, open **Connections → Resend** and paste it.
3. Under **Plan**, pick the plan you pay for. Resend's API doesn't report it.
4. Press **Test**, then **Connect**.

Resend updates its counts up to 15 minutes late, so the current month can trail your dashboard by that much.

## Costs per product

Each sending domain appears on the connection's page. Assign it to a product and its email costs follow, past days included. Emails without a domain go to the product picked at the top of the same page.
