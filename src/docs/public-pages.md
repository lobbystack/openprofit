---
navLabel: Public Pages
contentType: How-to
description: Publish a product's revenue, costs or growth on a public page, and choose how much it shows.
---

# Share a product’s numbers on a public page

A public page shows one product’s numbers to anyone with the link, for example to build in public. This page explains how to turn one on and what each mode shows.

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
| Full | Revenue, costs, profit, margin and the monthly chart |
| Revenue | Revenue and the chart, without costs |
| Growth and margin | Revenue change from last month and this month’s margin, without amounts |

The page reads the same data as your dashboard, so it updates after every sync. Each page ends with a “Built with OpenProfit” line.
