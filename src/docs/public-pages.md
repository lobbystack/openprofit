---
navLabel: Public Pages
contentType: How-to
description: Publish a product's revenue, costs or growth on a public page, embed its badge, and get listed on the open profit leaderboard.
---

# Share a product’s numbers on a public page

A public page shows one product’s numbers to anyone with the link, for example to build in public. This page explains how to turn one on, what each mode shows, how to embed the badge and how a product gets on the leaderboard.

## Turn on a public page

Open **Products** and pick a mode in the product’s **Public** column. The page goes live at once at this address:

```text
https://openprofit.dev/p/your_workspace_slug/your_product_slug
```

On a self-hosted instance the address starts with your `APP_URL`. Set the mode back to **Off** to take the page down.

## Choose what the page shows

Each mode reveals a different amount of detail:

| Mode | What visitors see |
| --- | --- |
| Off | Nothing. The address returns a 404 error |
| Full | Revenue, costs, profit, margin, the monthly chart and each cost source with its amount |
| Revenue | Revenue and the chart, without costs |
| Growth and margin | Revenue growth, margin and the cost sources, without amounts |

The numbers cover the last 30 days, and growth compares them with the 30 days before. The page reads the same data as your dashboard, so it updates after every sync. Each page ends with a “Built with OpenProfit” line.

## Show visitors where the numbers come from

The cost list names each source assigned to the product, with its logo. Costs you add under **Costs** › **Flat costs** carry a “Self-reported” label. Costs you haven’t assigned to a product stay off the page, and the page says it excludes shared costs, with their total in Full mode.

On openprofit.dev, each page also carries a **Verified** mark and names the providers it read: OpenProfit pulls those amounts from the providers’ APIs, and you can’t edit them. Self-hosted pages don’t show the mark.

## Embed the badge in a README or site

Each public page has a badge at its address plus `/badge.svg`. It shows the same numbers as the page: revenue and margin in Full mode, revenue in Revenue mode, margin and growth in Growth and margin mode. Open the page while signed in to its workspace, or click the badge button next to the mode in **Products**, to copy the Markdown or HTML snippet:

```markdown
[![Your product on OpenProfit](https://openprofit.dev/p/your_workspace_slug/your_product_slug/badge.svg)](https://openprofit.dev/p/your_workspace_slug/your_product_slug)
```

The badge refreshes within five minutes of a sync. Links shared on social sites show an image with the same numbers, at `/og.png`.

## Get listed on the leaderboard

[openprofit.dev/open](https://openprofit.dev/open) ranks public products by profit over the last 30 days, with tabs for revenue, margin and growth. A product appears once it meets these conditions:

- Its public page is on
- It has revenue and at least one connected cost provider
- Its first revenue is at least 30 days old

Each tab lists only the products whose mode shows that number, so a Growth and margin page appears on the margin and growth tabs. Rankings count only costs read from provider APIs. Self-reported costs show on the product’s page but not on the leaderboard. Products on self-hosted instances don’t appear.
