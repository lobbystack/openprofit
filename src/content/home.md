# OpenProfit: finance for developers

OpenProfit is the open-source finance dashboard for developers. It brings your revenue and every bill you pay into one place, so you know what each product earns after costs.

- Website: https://openprofit.dev
- Source: https://github.com/lobbystack/openprofit (MIT license)
- Docs: https://openprofit.dev/docs/self-host

## What it does

- **Connects your stack**: revenue from Stripe and Polar; costs from OpenAI, Anthropic, Vercel, Cloudflare and Railway billing APIs; anything else as a flat monthly or yearly cost
- **Shows profit per product**: each OpenAI project, Vercel project, Anthropic workspace, Railway project or Cloudflare zone maps to the product it serves
- **Uses one currency**: every line converts to the workspace's base currency at that day's European Central Bank rate
- **Watches for changes**: a Monday email with last week's revenue, costs and profit, and alerts when a bill doubles, a margin drops or a sync fails
- **Shares numbers if you want**: an optional public page per product
- **Runs anywhere**: one Docker container with Postgres built in, or the hosted version

## Pricing

| Plan | Price | For workspaces with | Sync frequency |
| --- | --- | --- | --- |
| Free | $0 | Under $2,500 MRR | Every 6 hours |
| Indie | $19 per month | Up to $25,000 MRR | Every hour |
| Pro | $49 per month | Over $25,000 MRR | Every 15 minutes |

Self-hosting is free at any revenue. Every plan includes every connector.

## More

- Integrations: https://openprofit.dev/integrations
- Comparisons: https://openprofit.dev/compare/profitwell, https://openprofit.dev/compare/baremetrics, https://openprofit.dev/compare/spreadsheet
- Changelog: https://openprofit.dev/changelog
