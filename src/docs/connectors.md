---
navLabel: Connecting Providers
contentType: How-to
description: Connect the services that pay you and the services you pay, assign their costs to your products, and add costs that have no API.
---

# Connect your revenue and cost providers

This page explains how connectors pull your revenue and costs and how to assign costs to products. It also covers costs from services with no API. Each provider has its own setup page under [Integrations](/integrations).

## How a connection works

A connector reads data from a provider with a read-only key that you create in the provider’s dashboard. In OpenProfit, open **Connections**, pick a provider, paste the key and click **Test**. The test calls the provider and shows the account name it found. Click **Connect** to save the key, encrypted with `SECRET_KEY`.

The first sync pulls two years of history, or one year on the free hosted plan. Later syncs reread the last three days and replace what changed, so a provider’s late corrections update the earlier figure instead of adding a second one.

## What each connector reads

Each connector needs a key with specific permissions. The table lists what each one reads and the key it needs:

| Provider | What it reads | Key |
| --- | --- | --- |
| [Stripe](/integrations/stripe) | Balance transactions, and active subscriptions for monthly recurring revenue (MRR) and customer count | Restricted key with read access to Balance, Balance transaction sources, Charges and Subscriptions |
| [Polar](/integrations/polar) | Daily revenue and net revenue, MRR, active subscriptions | Organization access token with `organizations:read` and `metrics:read` |
| [OpenAI](/integrations/openai) | Daily cost by project and line item | Organization admin key |
| [Anthropic](/integrations/anthropic) | Daily cost by workspace and description | Admin key, available on organization accounts only |
| [Vercel](/integrations/vercel) | Daily charges per project | Access token scoped to the team |
| [Cloudflare](/integrations/cloudflare) | Billable usage, or invoices when usage isn’t available | API token with Account · Billing · Read and Account · Account Settings · Read |
| [Railway](/integrations/railway) | Monthly CPU, memory, egress, disk and backup usage per project, priced at Railway’s published rates | Account token, or a workspace token with its workspace id |
| [Firecrawl](/integrations/firecrawl) | Credits per API key per billing period, priced at Firecrawl’s published plan and extra-credit rates | Any API key on the team |
| [Resend](/integrations/resend) | Transactional emails per sending domain per month, priced at Resend’s published plan and overage rates | API key with full access |

## Assign costs to products

OpenProfit assigns a cost to a product through the provider’s own grouping. These groupings are:

- **OpenAI**: projects
- **Anthropic**: workspaces
- **Vercel**: projects
- **Railway**: projects
- **Cloudflare**: zones
- **Firecrawl**: API keys
- **Resend**: sending domains

Open a connection from **Connections** to see each grouping with this month’s spend, then pick the product it serves. Past lines move to that product too.

Lines with no grouping, and all revenue from the connection, go to the product you pick at the top of the same page. If your workspace has one product, everything goes to it by default. Anything left unassigned appears as **Shared** on the overview.

## Add costs that have no API

Services like Supabase or a domain registrar don’t expose billing data, and neither do Resend’s marketing plans and add-ons. Add them on the **Costs** page as a fixed amount per month or per year, with a start date. OpenProfit counts them from that date and spreads a yearly amount evenly over 12 months.

## Currency conversion

Each workspace has one base currency, set during onboarding and editable in **Settings**. OpenProfit converts every line in another currency at the European Central Bank (ECB) rate for that line’s date. When you change the base currency, every stored line converts again at its own date’s rate.
