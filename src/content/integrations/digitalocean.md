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
- the product, such as Droplets, Kubernetes Clusters or Managed Databases;
- the DigitalOcean project the resources belong to.

Past months come from the issued invoice. The current month comes from the invoice preview, which DigitalOcean updates daily, so this month's figure grows until the invoice closes.

## Connect it

1. In DigitalOcean, open **API → Tokens** and generate a personal access token. Under **Custom Scopes**, tick **billing:read** and **account:read**.
2. In OpenProfit, open **Connections → DigitalOcean** and paste the token.
3. Press **Test**, then **Connect**. The test shows your team name.

## Costs per product

Each DigitalOcean project appears on the connection's page. Assign it to a product and its costs follow, past months included. Invoice items without a project stay under Unassigned.

## Common questions

**Why don't I see daily figures?** DigitalOcean itemizes costs per project only on invoices, and invoices cover a month.
