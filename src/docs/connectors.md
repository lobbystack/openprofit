---
navLabel: Connecting Providers
contentType: How-to
description: Connect the services that pay you and the services you pay, assign their costs to your products, and add costs that have no API.
---

# Connect your revenue and cost providers

This page explains how connectors pull your revenue and costs and how to assign costs to products. It also covers costs from services with no API. Each provider has its own setup page under [Integrations](/integrations).

## How a connection works

A connector reads data from a provider with a read-only key that you create in the provider’s dashboard. In OpenProfit, open **Connections**, pick a provider, paste the key and click **Test**. The test calls the provider and shows the account name it found. Click **Connect** to save the key, encrypted with `SECRET_KEY`.

The first sync pulls two years of history, or one year on the free hosted plan. Later syncs reread from three days before the last successful sync and replace what changed, so a provider’s late corrections update the earlier figure instead of adding a second one. After an outage, the next sync covers every day it missed. Lines the provider no longer reports are deleted, within the history its API returns.

When a sync fails, OpenProfit retries it an hour later, then waits twice as long after each failure, up to a day. When the provider rejects the key, OpenProfit stops retrying until you click **Sync now** on the connection.

## What each connector reads

Each connector needs a key with specific permissions. The table lists what each one reads and the key it needs:

| Provider | What it reads | Key |
| --- | --- | --- |
| [Stripe](/integrations/stripe) | Balance transactions, and active subscriptions for monthly recurring revenue (MRR) and customer count | Restricted key with read access to Balance, Balance transaction sources, Charges, Invoices and Subscriptions |
| [Polar](/integrations/polar) | Daily revenue and net revenue, MRR, active subscriptions | Organization access token with `organizations:read` and `metrics:read` |
| [Paddle](/integrations/paddle) | Completed transactions without tax, Paddle’s fee, refunds, credits and chargebacks, MRR, paying subscribers | API key with `transaction.read`, `adjustment.read` and `metrics.read` |
| [Lemon Squeezy](/integrations/lemonsqueezy) | Orders and subscription renewals without tax, refunds, MRR, active subscriptions. No fees: the API doesn’t report them | API key, which has full access |
| [RevenueCat](/integrations/revenuecat) | Monthly revenue net of taxes and proceeds after store commission, MRR, active subscriptions | Secret API key (v2) with `project_configuration:projects:read` and `charts_metrics:overview:read` |
| [OpenAI](/integrations/openai) | Daily cost by project and line item | Organization admin key |
| [Anthropic](/integrations/anthropic) | Daily cost by workspace and description | Admin key, available on organization accounts only |
| [OpenRouter](/integrations/openrouter) | Daily cost by API key and model for the last 30 days, excluding bring-your-own-key (BYOK) usage | Management key, which can also create and delete API keys |
| [Vercel](/integrations/vercel) | Daily charges per project | Access token scoped to the team |
| [Cloudflare](/integrations/cloudflare) | Billable usage, or invoices when usage isn’t available | API token with Account · Billing · Read and Account · Account Settings · Read |
| [Railway](/integrations/railway) | Monthly CPU, memory, egress, disk and backup usage per project, priced at Railway’s published rates | Account token, or a workspace token with its workspace id |
| [DigitalOcean](/integrations/digitalocean) | Monthly cost per project and product, from invoices and the current month’s preview | Personal access token with the `billing:read` and `account:read` scopes |
| [GitHub](/integrations/github) | Daily net usage cost per SKU and repository, for an organization or a personal account | Fine-grained token with Administration read access on the organization, or Plan read access on your account |
| [Twilio](/integrations/twilio) | Daily total usage cost, subaccounts included | Restricted API key with `/twilio/billing/usage/read` |
| [Firecrawl](/integrations/firecrawl) | Credits per API key per billing period, priced at Firecrawl’s published plan and extra-credit rates | Any API key on the team |
| [Resend](/integrations/resend) | Transactional emails per sending domain per day, priced at the published fee and overage rates of the plan you pick | API key with full access |
| [xAI](/integrations/xai) | Daily cost by billing description, such as a model | Management key |
| [Neon](/integrations/neon) | Monthly compute, storage, transfer and branch usage per project, priced at Neon’s published rates | Organization API key |
| [MongoDB Atlas](/integrations/mongodb) | Daily invoice line items per project and stock keeping unit (SKU), including the current month’s pending invoice | Service account with the Organization Billing Viewer role |

## Sales tax and VAT

Revenue, profit, MRR and margins leave out the sales tax and VAT your customers pay. OpenProfit stores the tax on each revenue line, in the line’s currency and your base currency. When a period has tax, the overview shows **Tax collected** under the chart, with the share you file yourself.

| Provider | Tax it records | Who files it |
| --- | --- | --- |
| Stripe | The tax on the invoice behind each charge. A refund or dispute takes back the same share of tax. Payments without an invoice, such as one-off Checkout and Payment Links payments, record no tax, and their tax stays in revenue | You |
| Polar | None. Polar’s metrics leave tax out of revenue and don’t report it | Polar, as merchant of record |
| Paddle | The tax on each transaction, and the tax returned on each refund, credit or chargeback | Paddle, as merchant of record |
| Lemon Squeezy | The tax on each order and renewal, and the tax share of each refund | Lemon Squeezy, as merchant of record |
| RevenueCat | RevenueCat’s monthly estimate: revenue minus revenue net of taxes | The App Store and Google Play. For RevenueCat Web Billing sales, you |

Stripe needs read access to **Invoices** to find the tax. A key without it still syncs, but its revenue includes tax.

## Assign costs to products

OpenProfit assigns a cost to a product through the provider’s own grouping. These groupings are:

- **OpenAI**: projects
- **Anthropic**: workspaces
- **OpenRouter**: API keys
- **Vercel**: projects
- **Railway**: projects
- **Cloudflare**: zones
- **DigitalOcean**: projects
- **GitHub**: repositories
- **Firecrawl**: API keys
- **Resend**: sending domains
- **Paddle** and **Lemon Squeezy**: products, for revenue
- **RevenueCat**: projects, for revenue
- **Neon**: projects
- **MongoDB Atlas**: projects

Open a connection from **Connections** to see each grouping with this month’s spend, then pick the product it serves. Past lines move to that product too.

Lines with no grouping or an unassigned one go to the product you pick at the top of the page. Revenue follows the same rules. If your workspace has one product, everything goes to it by default. Anything left unassigned appears as **Shared** on the overview.

## Add costs that have no API

Services like Supabase or a domain registrar don’t expose billing data, and neither do Resend’s marketing plans and add-ons. Add them on the **Costs** page as a fixed amount per month or per year, with a start date. OpenProfit counts them from that date and spreads a yearly amount evenly over 12 months.

## Currency conversion

Each workspace has one base currency, set during onboarding and editable in **Settings**. OpenProfit converts every line in another currency at the European Central Bank (ECB) rate for that line’s date. When you change the base currency, every stored line converts again at its own date’s rate.
