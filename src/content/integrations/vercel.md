---
title: Track Vercel costs per project
name: Vercel
kind: cost
summary: Daily charges per project, read from Vercel's billing API.
description: See what each Vercel project costs per day, from functions to bandwidth, next to the revenue of the product it hosts.
---

# Track Vercel costs per project

A Vercel invoice is one number for the whole team. OpenProfit breaks it down by project and day, so the product with the expensive functions shows up as the product with the thin margin.

## What it reads

OpenProfit reads Vercel's billing charges, which Vercel publishes in the FOCUS format for cloud costs. For each charge it records:

- the day and the amount billed;
- the service, such as functions, edge requests or bandwidth;
- the project, when Vercel attributes the charge to one.

Charges that belong to the team as a whole, like the seat price of a Pro plan, have no project. They stay in the shared bucket.

## Connect it

1. In Vercel, open **Account Settings → Tokens** and create a token scoped to the team you want to read. Your role on that team needs billing access.
2. In OpenProfit, open **Connections → Vercel** and paste the token. Add the team id if the token can see more than one team.
3. Press **Test**, then **Connect**.

## Costs per product

Each project that has charges appears on the connection's page. Assign it to a product once and its costs follow from then on, including past days.

## Common questions

**I'm on the Hobby plan.** Hobby has no charges to read. The connector is useful once a team is on a paid plan.
