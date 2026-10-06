---
title: Paddle revenue after fees, tax and refunds
name: Paddle
kind: revenue
summary: Completed transactions, refunds and chargebacks, MRR and paying subscribers.
description: See your Paddle revenue without tax, net of Paddle's fee and refunds, next to what your product costs to run. Connect with a read-only API key.
---

# Paddle revenue after fees, tax and refunds

Paddle sells your product as merchant of record, so it collects sales tax and VAT and keeps a fee on each sale. OpenProfit reads what you keep after both and sets it against your costs.

## What it reads

OpenProfit reads three things from Paddle Billing:

- **Completed transactions:** revenue without tax, the tax, and Paddle's fee. Free trial transactions total zero and are skipped.
- **Approved refunds, credits and chargebacks:** each one subtracts its amount before tax, and the tax it returns, on the day Paddle created it. When Paddle returns part of its fee on a refund, that part comes back to you.
- **Metrics:** monthly recurring revenue (MRR) and paying subscribers, in your balance currency. Trials don't count.

The tax shows as **Tax collected** on the overview, kept apart from revenue. Paddle files it, so you don't owe it.

Transactions stay in the currency the customer paid in and convert to your base currency at the European Central Bank rate for that day. The first sync goes back two years. Invoices you send manually get paid later than they're billed, so each sync rereads 90 days of them.

## Connect it

1. In Paddle, open **Authentication**, then the **API keys** tab, and create a key with three permissions: `transaction.read`, `adjustment.read` and `metrics.read`. Set the expiry as far out as Paddle allows, one year. When the key expires, syncing stops.
2. In OpenProfit, open **Connections → Paddle**, paste the key and press **Test**.
3. Press **Connect**.

A sandbox key (`pdl_sdbx_…`) reads your sandbox account instead.

## Revenue per product

Paddle revenue goes to the product you pick on the connection's page. If you run one Paddle account per product, connect each one and point it at its product.
