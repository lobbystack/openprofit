---
title: Lemon Squeezy revenue, refunds and MRR
name: Lemon Squeezy
kind: revenue
summary: Orders and subscription renewals without tax, refunds, MRR and active subscriptions.
description: Bring your Lemon Squeezy sales, renewals and refunds into one view with your costs. Connect with an API key.
---

# Lemon Squeezy revenue, refunds and MRR

Lemon Squeezy sells your product as merchant of record and collects sales tax and VAT for you. OpenProfit reads what your customers paid before tax and sets it against what the product costs to run.

## What it reads

OpenProfit reads every store your API key can see:

- **Orders:** one-time purchases and the first payment of each subscription.
- **Subscription invoices:** renewals and plan changes.
- **Refunds:** recorded on the day of the refund, without the tax share.
- **Tax:** the sales tax or VAT on each order and renewal, less the share refunded. It shows as **Tax collected** on the overview, kept apart from revenue. Lemon Squeezy files it.
- **Subscriptions:** monthly recurring revenue (MRR) from active subscriptions at their price, and the number of active subscriptions. Prices with tiers or usage billing have no fixed amount, so MRR leaves them out.

The first sync goes back two years. Amounts in other currencies convert to your base currency at the European Central Bank rate for the day of the sale.

## Limitations

Lemon Squeezy's API doesn't report its fees, so OpenProfit records revenue before them. Your profit shows higher than what reaches your bank by the Lemon Squeezy fee on each sale. To count it, add an estimate as a flat monthly cost.

Refunds only appear on the original order, and the API can't filter orders by date. Each sync rereads 30 days of orders and invoices, and the first sync of each day rereads 180. A refund issued more than 180 days after the sale doesn't show up.

An order with several items counts toward the product of its first item. The order list reports only that item, and reading the others takes one request per order.

## Connect it

1. In Lemon Squeezy, open **Settings → API** and create a key. Lemon Squeezy keys can't be limited to reading; OpenProfit only sends read requests. Keys last one year; when yours expires, syncing stops.
2. In OpenProfit, open **Connections → Lemon Squeezy**, paste the key and press **Test**. The test shows your store names.
3. Press **Connect**.

A test mode key reads your test mode data instead.

## Revenue per product

Each Lemon Squeezy product appears on the connection's page. Assign it to a product and its revenue follows, past sales included. Revenue without a product goes to the product you pick at the top of the same page.
