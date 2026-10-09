---
title: My SaaS bills go on my personal card, so I built my own books
description: A Redditor asked why they'd use OpenProfit over QuickBooks. QuickBooks reads the company's bank, and my company's bills are on my personal card.
date: 2026-10-08
author: Raphael Morency
---

# My SaaS bills go on my personal card, so I built my own books

This week I asked on Reddit what people would think if OpenProfit did their accounting from their API keys. One reply: "Why would I choose this over QuickBooks is the main question." My answer is the reason OpenProfit now has a **Books** page, which writes a month of journal entries and a year of tax lines from the provider APIs it already reads.

## How my company pays its bills

I run a small SaaS through Lobbystack Inc., a company incorporated in Quebec. It has four customers and makes under $200 a month. Polar takes the payments, and five providers send the bills:

- **Railway**: hosting
- **OpenAI**: the AI features
- **Twilio**: phone numbers
- **Firecrawl**: web scraping
- **Resend**: email

All five charge my personal credit card, and so do the domains.

## Why QuickBooks never sees those bills

QuickBooks and Xero start from bank feeds: they import the transactions from the company's bank accounts and cards, and you sort each one into an account. Lobbystack Inc.'s bank account sees Polar's payouts. It never sees OpenAI, Railway or Twilio, because my personal card pays them.

That leaves two options in QuickBooks. I could connect my personal card and sort OpenAI from groceries every month, or type in each bill by hand from five billing pages.

Polar's payouts cause a second problem. Polar is the merchant of record: it collects the sales tax, files it, and pays me what's left after its fee. The deposit isn't my revenue. My books need the gross sale, the fee and any refund, and only Polar's API has those numbers.

## Why I don't hand it to a bookkeeper

Another commenter pointed out that a company has to keep books anyway, and the books give you each month's revenue and profit. They're right about the first part. Lobbystack Inc. files a T2 and a CO-17 every year, and the CRA expects six years of records.

[Pilot](https://pilot.com/pricing) charges $99 a month for automated bookkeeping and $299 a month with a human bookkeeper. My SaaS makes under $200 a month. I'll hire an accountant once the business makes a few thousand dollars a month. Until then, the books are my job.

## What OpenProfit writes for me now

OpenProfit already reads Polar and the five providers to show profit per product. The **Books** page turns the same lines into a journal for each month:

- **Sales**: gross sales, payment fees and refunds on separate lines
- **Bills**: each provider's bill as an expense, under AI and APIs, hosting, email or software
- **My card**: what my personal card paid, as money Lobbystack Inc. owes me
- **Yearly plans**: spread over the months they pay for

I download each month as a QuickBooks or Xero import file, a plain journal, or a CSV. Exporting a month closes it. If a provider corrects a bill later, my next export adds an adjustment and leaves the month I already sent alone.

When Bench shut down without notice in December 2024, [its customers lost access to their books and tax documents](https://techcrunch.com/2024/12/27/bench-shuts-down-leaving-thousands-of-businesses-without-access-to-accounting-and-tax-docs/) at year end. My exports are files on my computer, and OpenProfit is open source, so my books don't depend on OpenProfit staying in business.

At the end of the year, the tax report adds up the year on the lines of my forms. For Lobbystack Inc., that's the GIFI schedules that go with the T2. Without a company, you'd get the T2125 (plus the TP-80 in Quebec) or Schedule C in the US. [Which tax line each cost goes on](/blog/tax-lines-for-software-costs) lists them line by line.

## My answer to "why not QuickBooks"

Keep QuickBooks if you already pay for it. OpenProfit's QuickBooks file leaves out the money your bank feed already records and adds what the feed can't see: the sales behind each payout and the bills on your personal card. Your bookkeeper imports one file a month instead of rebuilding sales from deposits.

If you don't have QuickBooks, the journal and the tax report cover a company like mine: one product, a handful of providers, no payroll. That's how I'll keep Lobbystack Inc.'s books until I can pay an accountant to check them.

## What Books leaves out

Books covers revenue and costs, and these stay outside it:

- **Sales tax returns, payroll, receipts and home office expenses**: you still handle them
- **Polar payouts**: Polar's API doesn't share them, so OpenProfit can't record the money Polar sends to your bank
- **Fiscal years**: the books follow the calendar year

OpenProfit prepares the numbers and doesn't give tax advice. I read the CRA, Revenu Québec and IRS guides for every line, and the tax report links each source. [Keep your books and prepare your tax numbers](/docs/books) shows how to set it up.
