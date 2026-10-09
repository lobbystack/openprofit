# OpenProfit: finance for developers

OpenProfit is open-source finance for developers. Connect Stripe, OpenAI, Vercel and every other bill. See what each of your apps earns after costs, and get the numbers for your tax return.

- Website: https://openprofit.dev
- Source: https://github.com/lobbystack/openprofit (MIT license)
- Docs: https://openprofit.dev/docs/self-host

## What it does

- **Connects your stack**: revenue from Stripe, Polar, Paddle, Lemon Squeezy and RevenueCat; costs from OpenAI, Anthropic, OpenRouter, xAI, Vercel, Cloudflare, Railway, DigitalOcean, GitHub, Twilio, Neon, MongoDB Atlas, Firecrawl and Resend; anything else as a flat monthly, yearly or one-time cost
- **Shows profit per app**: each Paddle product, OpenAI project, Vercel project, Neon project, GitHub repository or sending domain maps to the app it serves
- **Gives you your tax numbers**: the year's totals on the lines of the T2125 and TP-80 in Canada, the T2's GIFI schedules for a Canadian company, or Schedule C or Form 1120 in the US, plus a monthly journal for QuickBooks or Xero ([Books](https://openprofit.dev/docs/books))
- **Uses one currency**: every line converts to the workspace's base currency at that day's European Central Bank rate, or the Bank of Canada's for a workspace in Canadian dollars
- **Watches for changes**: a weekly email with last week's revenue, costs and profit on the day and hour you pick, and an email when a bill doubles, a margin drops or a sync fails
- **Shares numbers if you want**: an optional public page per app
- **Runs anywhere**: one Docker container with Postgres built in, or the hosted version

## Pricing

| Plan | Price | For workspaces with | Sync frequency |
| --- | --- | --- | --- |
| Free | $0 | Under $2,500 MRR | Every 6 hours |
| Indie | $19 per month | Up to $25,000 MRR | Every hour |
| Pro | $49 per month | Over $25,000 MRR | Every 15 minutes |

Self-hosting is free at any revenue. Every plan includes every integration.

## More

- Integrations: https://openprofit.dev/integrations
- Comparisons: https://openprofit.dev/compare/profitwell, https://openprofit.dev/compare/baremetrics, https://openprofit.dev/compare/spreadsheet
- Changelog: https://openprofit.dev/changelog
