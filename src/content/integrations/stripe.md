---
title: Stripe revenue after fees and refunds
name: Stripe
kind: revenue
summary: Net revenue from balance transactions, plus MRR and active subscriptions.
description: See your Stripe revenue net of fees and refunds, with MRR and active subscriptions, next to every cost of running your product.
---

# Stripe revenue after fees and refunds

Stripe's dashboard leads with gross volume. What reaches your bank is less: Stripe's fees, refunds and disputes come off first. OpenProfit reads the net figure, then subtracts the rest of your costs, so the number you see is what the product keeps.

## What it reads

- **Balance transactions:** every charge, refund, fee and dispute, with its gross amount, fee and net. Payouts and transfers are movements of money you already earned, so they're skipped.
- **Subscriptions:** active subscriptions give your MRR and customer count. Yearly and weekly prices are converted to a monthly figure. Metered prices are left out of MRR because their amount isn't known until the period ends.

Amounts in other currencies convert to your base currency at the European Central Bank rate for the day of the transaction.

## Connect it

1. In the Stripe dashboard, open **Developers → API keys** and create a restricted key with read access to **Balance**, **Balance transaction sources**, **Charges** and **Subscriptions**.
2. In OpenProfit, open **Connections → Stripe**, paste the key and press **Test**. The test shows your account's name.
3. Press **Connect**. The first sync reads two years of transactions.

A restricted key can't move money or change your account.

## Revenue per product

Stripe revenue goes to the product you pick on the connection's page. If you run one Stripe account per product, connect each and point it at its product.
