---
title: Track DigitalOcean costs per project
name: DigitalOcean
kind: cost
summary: Monthly cost per project and product, from your DigitalOcean invoices.
description: See what each DigitalOcean project costs per month, from Droplets to managed databases, next to the revenue of the product it runs.
---

# Track DigitalOcean costs per project

DigitalOcean sends one invoice for the whole account. OpenProfit splits it by project and product, so you can see which of your products pays for which Droplets.

## What it reads

OpenProfit reads your invoice items through DigitalOcean's billing API. For each month it records:

- the amount in US dollars, summed per project and product;
- the product, as the invoice names it, such as Kubernetes Clusters or Floating IPs;
- the DigitalOcean project the resources belong to.

DigitalOcean invoices on the first day of each month for the month before. The current month comes from the invoice preview, which DigitalOcean generates daily, so this month's figure grows until the invoice arrives and replaces it.

The first sync reads two years of invoices, or one year on the hosted Free plan. Later syncs reread the current month, and last month early in a new month, to pick up the issued invoice.

In the last 30 days view, OpenProfit spreads each month's total across its days.

## Connect it

1. In the DigitalOcean control panel, open **Account → API**. On the **Tokens** tab, click **Generate New Token**.
2. Name the token and choose an expiration. Under **Scopes**, select **Custom Scopes** and tick `billing:read` and `account:read`, nothing else.
3. In OpenProfit, open **Connections → DigitalOcean** and paste the token.
4. Press **Test**, then **Connect**. The test shows your team name.

Both scopes are read-only. One covers invoices, the other the account details the test shows.

## Costs per product

Each DigitalOcean project with costs this month appears on the connection's page. Assign it to a product and its costs follow, past months included. Invoice items without a project sit in a **Not in a project** row, which follows the product you pick for it or stays under Unassigned.

In the sample stack from [the monthly cost of running a SaaS](/blog/saas-running-costs), payment fees and analytics cost more than hosting and the database at 100 and 1,000 customers. [Connecting providers](/docs/connectors) covers sync timing and flat costs.

## Common questions

**Why don't I see daily figures?** OpenProfit reads invoices, and each DigitalOcean invoice covers one month. The current month's preview still updates every day.

**Where do taxes go?** DigitalOcean's invoice data lists taxes as their own item with no project, so they land in the **Not in a project** row.

**What if one project runs everything?** Its costs go to one product. Move each product's resources into its own DigitalOcean project to split them.
