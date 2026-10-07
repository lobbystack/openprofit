---
title: Track MongoDB Atlas costs per project
name: MongoDB Atlas
kind: cost
summary: Daily invoice line items per project and SKU, including the current month.
description: See what each MongoDB Atlas project costs per day, from your Atlas invoices, next to the revenue of the product it serves. Connect with a billing-only service account.
---

# Track MongoDB Atlas costs per project

Atlas bills an organization once a month for every cluster, backup and data transfer in its projects. OpenProfit reads the line items of those invoices and assigns each Atlas project's costs to the product it serves.

## What it reads

OpenProfit reads your organization's invoices through the Atlas Administration API, including the pending invoice for the current month. For each line item it records:

- the day it covers
- the amount in US dollars, after any discount on that line
- the SKU, such as an instance size, storage or data transfer
- the project

The pending invoice changes as the month goes on. OpenProfit updates the lines it already stored instead of adding new ones. Credits applied to a whole invoice and sales tax aren't line items, so they don't appear.

## Connect it

1. In Atlas, open **Identity & Access → Applications** for your organization and click **Add new → Service Account**. Give it the **Organization Billing Viewer** role only.
2. Copy the client id and the client secret, which starts with `mdb_sa_sk_`. Atlas shows the secret once.
3. Add an API access list entry for each address OpenProfit calls Atlas from. On openprofit.dev, the connect page lists them. When you self-host, use your server's outbound IP addresses. By default, Atlas rejects API calls from addresses not on the list. If your organization turned off **Require IP Access List for the Atlas Administration API**, you can leave the list empty instead.
4. In OpenProfit, open **Connections → MongoDB Atlas**, paste the client id and secret, and press **Test**. Add the organization id only if the service account can see more than one organization.
5. Press **Connect**.

## Costs per product

Each Atlas project appears on the connection's page. Assign it to a product and its costs follow, past months included. Line items without a project get their own row on the same page.
