---
title: Which tax line do OpenAI, Vercel and Stripe fees go on?
description: The T2125, TP-80, GIFI, Schedule C and Form 1120 lines for AI APIs, hosting, payment fees, refunds, contractors and a laptop, checked against the 2025 forms.
date: 2026-10-08
author: Raphael Morency
---

# Which tax line do OpenAI, Vercel and Stripe fees go on?

No tax form has a line for AI APIs, hosting or email. In Canada they go under other expenses (T2125 line 9270, TP-80 line 246), or computer-related expenses (GIFI code 9150) for a corporation. In the US they go in Part V of Schedule C, or on line 26 of Form 1120. Payment fees, refunds, contractors and a laptop each have a better line, listed below.

Every line on this page comes from the 2025 forms and their guides, the most recent ones filed, checked on October 8, 2026. An asterisk marks a judgment call: no line names the cost, so the choice follows the guide's wording. None of this is tax advice.

## Canada without a company: T2125 and TP-80

A sole proprietor reports business income on the [T2125](https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t2125.html), and in Quebec also on the [TP-80](https://www.revenuquebec.ca/documents/en/formulaires/tp/TP-80-V(2025-10).pdf):

| Cost | T2125 | TP-80 |
|---|---|---|
| Sales | 3A Gross sales | 110 Sales |
| Refunds | 3B Returns, allowances, discounts | 113 Sales returns, allowances and discounts |
| Stripe, Polar or Paddle fees | 8871 Management and administration fees* | 216 Management and administration fees* |
| OpenAI, Anthropic, OpenRouter | 9270 Other expenses* | 246 Other expenses* |
| Vercel, Railway, Cloudflare, Supabase | 9270 Other expenses* | 246 Other expenses* |
| Resend, Postmark | 9270 Other expenses* | 246 Other expenses* |
| GitHub, Figma, ChatGPT Plus | 9270 Other expenses* | 246 Other expenses* |
| Domain renewals | 9270 Other expenses* | 246 Other expenses* |
| Freelancers | 8860 Professional fees | 246 Other expenses* |
| A laptop | 9936 Capital cost allowance | 240 Capital cost allowance |

The guides explain the choices:

- **Other expenses**: the [T4002 guide](https://www.canada.ca/content/dam/cra-arc/formspubs/pub/t4002/t4002-25e.pdf) puts on 9270 whatever no previous line covers, and asks you to list each one. Write "AI APIs", "Hosting" and so on. Office expenses (8810) means pens, stationery and stamps, and utilities (9220) means gas, electricity, water and cable, so neither fits.
- **Payment fees**: T4002 places bank charges under 8871, and Revenu Québec's [IN-155 guide](https://www.revenuquebec.ca/documents/en/publications/in/IN-155-V(2025-12).pdf) places them on line 216. Line 8710 covers interest on loans.
- **Freelancers**: T4002 describes 8860 as "external professional advice, services and consulting fees". Subcontracts (8360) sit in cost of goods sold, and a SaaS sells no goods. On the TP-80, line 228 fits a firm such as an accountant; list a freelance developer on 246.
- **Sales tax**: GST/HST and QST you collected aren't income. If your sales figure includes them, take them back out on 3B or line 114.

## Canada with a company: GIFI

A corporation files its financial statements with the T2 as GIFI codes ([RC4088](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4088/general-index-financial-information-gifi.html)), and a Quebec corporation files the same codes with the CO-17:

| Cost | GIFI, Schedule 125 |
|---|---|
| Sales, net of refunds | 8000 Trade sales of goods and services |
| Stripe, Polar or Paddle fees | 8715 Bank charges* |
| AI APIs, hosting, email, software | 9150 Computer-related expenses* |
| Freelancers | 9110 Sub-contracts |
| A laptop | 8670 Amortization of tangible assets |

RC4088 allows sales reported net of returns. Its only example for 8716 Credit card charges is interest on a card, so merchant fees fit 8715 better. Code 8670 holds the amortization in your financial statements; the tax deduction is capital cost allowance (CCA), claimed on Schedule 8.

If the founder pays company bills with a personal card, the company owes that money back. It goes on Schedule 100 under 2781 Due to individual shareholder(s).

## United States: Schedule C and Form 1120

A sole proprietor or single-member LLC files [Schedule C](https://www.irs.gov/instructions/i1040sc). A C corporation files [Form 1120](https://www.irs.gov/pub/irs-pdf/i1120.pdf):

| Cost | Schedule C | Form 1120 |
|---|---|---|
| Sales | 1 Gross receipts or sales | 1a Gross receipts or sales |
| Refunds | 2 Returns and allowances | 1b Returns and allowances |
| Stripe, Polar or Paddle fees | Part V, line 27b* | 26 Other deductions* |
| AI APIs, hosting, email | Part V, line 27b* | 26 Other deductions* |
| Software subscriptions | Part V, line 27b | 26 Other deductions* |
| Freelancers | 11 Contract labor | 26 Other deductions* |
| A laptop up to $2,500 | Part V, line 27b | 26 Other deductions* |
| A laptop over $2,500 | 13 Depreciation, from Form 4562 | 20 Depreciation, from Form 4562 |

Part V of Schedule C lists each expense no other line covers, by type and amount. The 2025 instructions name "subscription services paid to manage your business" under technology and software tools, the closest heading for AI and hosting too. Some preparers put payment fees on line 10, Commissions and fees, instead.

Two rules for contractors matter more than the line:

- **1099-NEC**: file one for each contractor you paid $600 or more in 2025. The threshold rises to $2,000 for payments made after 2025.
- **Software work done abroad**: since 2025, software development done in the US is deductible the year you pay for it. Development done outside the US is spread over 15 years ([Rev. Proc. 2025-28](https://www.irs.gov/pub/irs-drop/rp-25-28.pdf)).

## A laptop

A computer lasts more than a year, so you deduct it under each country's depreciation rules, for the share you use for the business:

- **Canada**: computers are class 50. One acquired and put in use after April 15, 2024 and before 2027 is deducted 100% in its first year. Parliament [enacted that rule](https://www.canada.ca/en/department-finance/news/2026/03/legislation-passes-to-implement-budget-2025-canada-strong.html) on March 26, 2026, though the 2025 guide still calls it proposed. Quebec applies it for 2025 and 2026. A laptop you owned before and moved into the business gets half the rate in its first year.
- **US, up to $2,500**: the [de minimis safe harbor](https://www.irs.gov/businesses/small-businesses-self-employed/tangible-property-final-regulations) deducts it in full on Part V. You attach an election statement to your return each year, and you need the practice of expensing such items in place from January 1.
- **US, over $2,500**: it's 5-year property on Form 4562. Bought and placed in service after January 19, 2025, it gets 100% bonus depreciation in its first year.

## Sales through Polar, Paddle or Lemon Squeezy

A merchant of record (MoR) sells to your customer, collects and files the sales tax, and pays you what's left after its fee. No CRA, Revenu Québec or IRS guidance addresses these sales. Two ways to book them give the same profit:

- **Gross**: the customer's price before tax as sales, the MoR's cut as a payment fee. OpenProfit books them this way, so the fee shows as its own line.
- **Net**: what the MoR owes you as sales, with no fee line.

Leave the sales tax the MoR collected out either way: the MoR owes it, not you.

## Domains and records

A yearly domain registration or renewal is an ordinary expense. A domain you bought from its previous owner is a capital purchase: in the US, the IRS spreads one used as a brand or for a revenue-earning site over 15 years. The CRA hasn't published guidance on bought domains, so ask an accountant.

Keep invoices and records for six years in Canada and Quebec. The IRS asks for three years by default, and six if you left out more than 25% of your income.

## Get these numbers from your providers

The **Books** page in OpenProfit adds up your year from the Stripe, Polar, Paddle, OpenAI, Vercel and other accounts you connect, and lists each total on the lines above. Each judgment call shows its reason, and each form links its source. [Keep your books and prepare your tax numbers](/docs/books) shows how to set it up.
