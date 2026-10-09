---
title: How to get Stripe into QuickBooks or Xero
description: A Stripe payout is net of fees and refunds, so the deposit isn't your revenue. The entries your books need, and four ways to get Stripe into QuickBooks or Xero.
date: 2026-10-08
author: Raphael Morency
---

# How to get Stripe into QuickBooks or Xero

Stripe pays you a payout net of its fees, refunds and disputes, so the deposit in your bank isn't your revenue. QuickBooks or Xero needs your gross sales, fees and refunds on separate lines, and the payout recorded as a transfer to your bank. This guide shows the entries, then compares four ways to make them: QuickBooks' own Stripe integration, Xero's Stripe feed, a sync app, and a monthly journal file from OpenProfit.

## Why the deposit isn't your revenue

Take a month with 40 customers on a $29 plan, Stripe's US card price of 2.9% + 30¢, and one refund:

| | Amount |
|---|---|
| Sales | $1,160.00 |
| Stripe fees | −$45.64 |
| Refund | −$29.00 |
| Payout to your bank | $1,085.36 |

Record the $1,085.36 deposit as income and your books understate sales by $74.64 and never show the fees. Intuit's community forum has threads about this mistake going back to 2021, along with sales counted twice when the bank feed and a sync app both record them.

## The entries your books need

Treat the Stripe balance as its own account, called a clearing account: money comes in from customers, fees and refunds go out, and payouts move the rest to your bank. Stripe's own QuickBooks Desktop export works this way, with an account named "Stripe Account".

| What happened | What your books record |
|---|---|
| A customer pays | Sales, added to the Stripe balance |
| Stripe takes its fee | A payment fee expense, out of the Stripe balance |
| You refund a customer | Refunds, a reduction of sales, out of the Stripe balance |
| A customer disputes a charge | The charge and the dispute fee ($15 in the US), out of the Stripe balance |
| Stripe pays out | A transfer from the Stripe balance to your bank |

At the end of each month, the Stripe balance account in your books should equal the ending balance on Stripe's [Balance summary report](https://docs.stripe.com/reports/balance).

Three more things change the entries:

- **Sales tax**: with Stripe Tax, you're the seller, so you file and remit the tax you collect. Record it as tax owed, not as sales. Polar, Paddle and Lemon Squeezy are merchants of record: they remit the tax themselves, so it stays out of your books.
- **Yearly plans**: under accrual accounting, a $240 yearly plan earns $20 a month. The rest sits in deferred revenue, a liability, until the months pass. In Canada, the CRA requires accrual for self-employment income other than farming, fishing and commission sales. In the US, a sole proprietor can use the cash method and record the $240 when paid.
- **Currencies**: Stripe converts a refund or dispute at the rate on the day it happens, so it can differ from the original sale.

## Four ways to get Stripe into your books

Each option below records the same entries. They differ in detail, price and which costs they cover.

### QuickBooks' own Stripe integration

Intuit's [Stripe connection for QuickBooks Online](https://quickbooks.intuit.com/learn-support/en-us/help-article/manage-integrations/connect-manage-stripe-transactions-quickbooks/L10TzOVcN_US_en_US) imports sales, refunds, payouts and adjustments. Each sale shows its gross amount, fee and net, with the fee posted to a "Stripe Fees" expense account. Each payout becomes a deposit linked to the sales and fees inside it.

Its help article, updated September 21, 2026, lists these limits:

- **One Stripe account** per QuickBooks company
- **Two years** of history at setup
- **About two hours** before a Stripe transaction appears, with no manual refresh

Intuit doesn't list a price, and the article exists for the US only. QuickBooks Self-Employed has no Stripe connection; you upload a CSV instead.

### Xero's Stripe integrations

Xero connects to Stripe in two ways:

- **Stripe as a payment service**: customers pay your Xero invoices through Stripe, with no setup or monthly fee. Xero matches each payout to its invoices and records the fees. Sales from your app's own checkout don't go through Xero invoices, so they get no automatic fee entries.
- **Stripe as a bank account (direct feed)**: Xero imports Stripe transactions starting from the most recent payout, and stops importing after a manual payout. Holding more than one currency needs multicurrency, which in the US is only on the Established plan at $97 a month.

### A sync app

Sync apps read Stripe and post each sale, or a daily summary, to QuickBooks or Xero. Entry prices from their pricing pages on October 8, 2026:

| App | Entry plan | What it covers |
|---|---|---|
| [Acodei](https://www.acodei.com/pricing) | $12 a month | 100 transactions a month, QuickBooks |
| [Bookkeep](https://www.bookkeep.com/pricing) | $19 a month | One sales channel, revenue up to $200,000 a year |
| [PayTraQer](https://support.saasant.com/support/solutions/articles/14000111497-paytraqer-pricing-plans-credits-refund-policies/) | $19 a month | 500 transactions a month, QuickBooks and Xero |
| [Synder](https://synder.com/pricing/) | $65 a month | 500 transactions a month, QuickBooks and Xero |

A2X, often recommended for Shopify and Amazon, doesn't support Stripe as a channel.

### A monthly journal from OpenProfit

OpenProfit reads Stripe, Polar, Paddle, Lemon Squeezy and RevenueCat, plus the bills from OpenAI, Vercel, Railway and 11 other providers. Its **Books** page writes one journal a month with:

- **Revenue**: gross sales, payment fees and refunds on separate lines, through a balance account for each provider
- **Yearly plans**: spread over the months they pay for
- **Bills**: each provider's usage as an expense, under AI and APIs, hosting, email or software
- **Personal card**: bills you paid yourself, as money the company owes you, or as money you put in if you have no company

The file summarizes each source for the month instead of posting every sale, so you won't see a customer on each line. Exporting a month closes it: if Stripe or a provider changes an amount later, the next export adds an adjustment. OpenProfit is free under $2,500 a month in revenue.

## Import OpenProfit's journal into QuickBooks Online

The QuickBooks file is a CSV with the columns QuickBooks asks for: Journal No., Journal Date, Account Name, Description, Debits and Credits. To import it:

1. In OpenProfit, open **Books** and click **Export**.
2. Pick **QuickBooks journal**, the month, and **All** under **Product**.
3. Under **Account names**, type the name of each account as it appears in your chart of accounts. Write a sub-account as `Parent:Sub`.
4. Click **Download**.
5. In QuickBooks, add any account the file names that you don't have yet, and turn off account numbers.
6. Open **Settings → Import data → Journal entries**, upload the file, map the fields, and start the import.

QuickBooks imports files under 1,000 rows. Products arrive as classes, which need class tracking on the Plus or Advanced plan.

The file leaves out payouts and bills paid from your company bank account, because your bank feed already downloads them. When a Stripe payout shows up in the bank feed, record it as a transfer from the **Stripe balance** account, not as income.

## Import OpenProfit's journal into Xero

Xero matches accounts by code, so the export asks for codes instead of names:

1. In OpenProfit, open **Books**, click **Export** and pick **Xero journal**.
2. Under **Account codes**, enter the code of each account in your Xero chart of accounts.
3. In **Tracking category**, type the name of your products' tracking category exactly as it appears in Xero. In **Tax rate**, type the full name of a Xero tax rate, or leave it blank and add one to each journal before you post it.
4. Click **Download**.
5. In Xero, open **Accounting → Manual journals → Import** and upload the file.

As with QuickBooks, match each payout in the bank feed to the Stripe balance account as a transfer.

## Which one to pick

Pick by what you need to see in your books:

- **Every sale against a customer or invoice**: QuickBooks' Stripe connection if you're in the US, Xero's Stripe payment service if you bill through Xero invoices, or a sync app otherwise.
- **One entry a month, with your AI and hosting bills in the same file**: OpenProfit's journal. It also covers Polar, Paddle and Lemon Squeezy, and bills on your personal card, which no bank feed sees.

[Keep your books and prepare your tax numbers](/docs/books) shows how to set up the Books page.
