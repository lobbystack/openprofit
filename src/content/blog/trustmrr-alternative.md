---
title: An open-source TrustMRR alternative with verified profit
description: TrustMRR verifies revenue, and sellers type in their own profit margin. OpenProfit also reads costs from provider APIs, so profit is verified. MIT licensed.
date: 2026-10-19
author: Raphael Morency
---

# An open-source TrustMRR alternative with verified profit

TrustMRR verifies what a startup earns. It reads revenue from Stripe, Polar or another payment provider through a read-only key, so a founder can't type in a bigger number. The profit margin on its listings comes from the seller, who types it into a form, and TrustMRR's tooltip calls it a "User-reported metric, not verified by TrustMRR."

OpenProfit reads both sides. Revenue comes from the payment provider, costs come from the billing APIs of OpenAI, Vercel, Railway and 11 other providers, and the public page shows the profit between them. The code is open source under the MIT license.

The TrustMRR facts below come from its own pages, checked on October 19, 2026.

## What TrustMRR verifies

Marc Lou launched TrustMRR on October 30, 2025, and it has grown into a database of more than 10,000 startups and a marketplace for buying them. To list a startup, you connect Stripe, Lemon Squeezy, Polar, Paddle, Dodo Payments, RevenueCat, Superwall, the App Store, Creem, Whop or Shopify with a read-only key, according to its [FAQ](https://trustmrr.com/faq). For Stripe it accepts only restricted keys.

TrustMRR then shows total revenue, MRR, revenue over the last 30 days, growth, customers and subscriptions, refreshed about every hour. Its FAQ warns that these figures can differ from your provider's dashboard by up to 30%, depending on how the provider handles refunds, trials, prorations and currency conversion.

## Where profit comes from on TrustMRR

Profit appears only on startups listed for sale, as a profit margin for the last 30 days. The seller types it into the listing form as a percentage. TrustMRR shows it with the unverified label to signed-in visitors, and section 10.3 of its [terms](https://trustmrr.com/terms) says it doesn't verify the profit margins sellers provide.

TrustMRR doesn't track costs. Its [API](https://trustmrr.com/docs/api/get-startup) has no expense field, and the listing's multiple divides the asking price by annualized revenue. One exception sits behind sign-in: an optional Meta Ads connection shows ad spend for the campaigns a founder picks.

So a buyer sees verified revenue next to a margin the seller chose. A seller who types 95% and a seller who earns 95% look the same on the listing.

## How OpenProfit gets to profit

OpenProfit reads revenue from Stripe, Polar, Paddle, Lemon Squeezy and RevenueCat, after payment fees and refunds, with sales tax and VAT taken out. It reads costs from the billing and usage APIs of OpenAI, Anthropic, OpenRouter, xAI, Vercel, Cloudflare, Railway, DigitalOcean, Neon, MongoDB Atlas, GitHub, Twilio, Resend and Firecrawl. Profit is revenue minus those costs, for each product.

Each public page names the providers behind its numbers. The page for [Lobbystack](https://openprofit.dev/p/lobbystack/lobbystack), the app my company sells, shows these numbers for the last 30 days:

| Revenue | Costs | Profit | Margin |
|---|---|---|---|
| $164 | $66 | $98 | 60% |

Below the numbers, the page says OpenProfit read them from the Polar, OpenAI, Railway and Twilio APIs, and lists each cost: OpenAI $39, Twilio $15, Railway $12. The founder can't edit those amounts.

Costs you add by hand, such as a domain or a contractor, appear on the page with a "Self-reported" label. The leaderboard at [openprofit.dev/open](https://openprofit.dev/open) ranks products by profit and leaves those costs out.

You choose how much a page shows. **Full** shows revenue, costs, profit and each cost source. **Revenue** shows revenue only. **Growth and margin** shows the margin and the cost sources without any amounts, for founders who want to prove they're profitable without saying how much they make.

## TrustMRR and OpenProfit side by side

| | TrustMRR | OpenProfit |
|---|---|---|
| Revenue | Verified, from 11 payment providers and app stores | Verified, from Stripe, Polar, Paddle, Lemon Squeezy and RevenueCat |
| Costs | Not tracked, apart from optional Meta Ads spend | Verified, from 14 provider billing APIs |
| Profit | A margin the seller types in, labelled unverified | Revenue minus verified costs, per product |
| Public numbers | Startup page and revenue badge | Product page in three modes, and a badge |
| Leaderboard | Revenue and MRR, more than 10,000 startups | Profit, revenue, margin and growth; one product so far |
| Selling a startup | Marketplace: listings from $29, 3% closing fee | Not offered |
| Source code | Closed | MIT, self-hosted in one Docker container |
| Price | Free to list, paid add-ons | Free up to $2,500 MRR, then $19 or $49 a month |

The OpenProfit leaderboard opened this month, and Lobbystack is the only product on it so far. TrustMRR's audience is far larger, and if you want buyers to see your startup, that matters more than anything in this table.

## What OpenProfit can't verify

Verified costs prove the amounts OpenProfit read. They can't prove nothing is missing:

- **A provider the founder didn't connect.** Check the list of providers on the page against the product. An AI app with no AI provider on its page is leaving out its largest bill.
- **Bills with no API**, such as a domain, a design tool or a contractor. They show as self-reported and stay out of the leaderboard.
- **Costs the founder hasn't assigned to the product.** The page leaves them out, and in Full mode it says how much it left out.
- **Self-hosted pages.** Whoever runs the server controls the database, so pages on a self-hosted instance carry no Verified mark and don't appear on the leaderboard. Verification needs the hosted version at openprofit.dev.
- **The founder's time**, which no billing API reports.

## Other open-source TrustMRR alternatives

Two other projects on page one of Google for "trustmrr alternative" call themselves open source. As of October 19, 2026:

- **OpenRevenue** is MIT-licensed on [GitHub](https://github.com/openrevenueorg/openrevenueorg). Its README roadmap leaves the Stripe integration and the verification system unchecked, the last commit dates from December 13, 2025, and openrevenue.org doesn't load.
- **Trust My MRR** launched in November 2025 as a Stripe-based alternative. trustmymrr.com returns a 404.

Neither one reads costs.

## Which one to use

- **To sell your startup**, list it on TrustMRR. Its buyers are the reason to be there, and OpenProfit doesn't sell startups.
- **If your revenue comes through the App Store, Shopify, Whop or Creem**, TrustMRR reads them and OpenProfit doesn't.
- **To show what you keep** when you build in public, publish an OpenProfit page.
- **To buy a startup from a listing**, ask the seller for verified costs: an OpenProfit page in Full mode, or exports from each billing page.
- **To do both**, connect the same Stripe or Polar account to each and put the two badges side by side. Both only read your data.

## Publish your profit on OpenProfit

1. [Create an account](https://openprofit.dev/login) and connect Stripe, Polar, Paddle, Lemon Squeezy or RevenueCat. Up to two years of history fill in.
2. Connect the providers you pay, such as OpenAI, Vercel or Railway, and assign their projects to your product.
3. Open **Products** and pick **Full**, **Revenue** or **Growth and margin** in the **Public** column. The page goes live at once, with a badge for your README or site.

The product joins the leaderboard once its first revenue is 30 days old and it has at least one connected cost provider. [Share a product's numbers on a public page](/docs/public-pages) covers each mode and the badge.
