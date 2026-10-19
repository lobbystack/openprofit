---
title: Spend limits vs budget alerts on Vercel, OpenAI and Firebase
description: A budget alert emails you hours after the money is gone. Spend limits on Vercel, OpenAI, Anthropic, Firebase, AWS, Supabase, Neon and Railway, and what to set.
date: 2026-10-19
author: Raphael Morency
---

# Spend limits vs budget alerts on Vercel, OpenAI and Firebase

In April 2026, a team found that someone had run up a [€54,000 Gemini bill](https://news.ycombinator.com/item?id=47791871) in 13 hours through their Firebase browser key. They had an €80 budget alert and a cost anomaly alert. Both fired a few hours late, and the charges had reached about €28,000 by the time the team reacted.

A budget alert emails you about money you've spent, after the provider finishes counting it. A spend limit blocks new requests once you cross it, a few minutes late. You want both, set per project, and on most providers you have to turn the limit on yourself.

## Budget alerts lag by hours

A budget alert reads the provider's billing data, and providers process that data in batches:

- **Google Cloud** says the first budget email can take several hours, and some costs take more than 24 hours to reach its [billing reports](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps).
- **AWS Budgets** updates up to three times a day, 8 to 12 hours apart, according to the [AWS docs](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html). Cost Anomaly Detection reads data up to 24 hours old.
- **Cloudflare** processes usage once a day, so its [budget alert](https://developers.cloudflare.com/billing/manage/budget-alerts/) fires the day after you cross the threshold.

Your services keep running while the email is on its way.

## Spend limits lag by minutes

A spend limit stops new usage once your spend crosses the cap. Vercel checks spend every few minutes. Gemini's project caps run about 10 minutes behind, and Firebase's spend caps several minutes. OpenAI says enforcement "is not instantaneous" and gives no number.

You pay for whatever runs in that gap. One developer set a $62.50 hard limit on an OpenAI project and [paid about $20 more](https://www.reddit.com/r/OpenAI/comments/1vb4yty/api_spend_limit_delay_costs_me_money/), because their script kept running for close to two hours. Set each cap below the most you can afford to lose.

## Provider by provider

Checked against each provider's docs on October 19, 2026:

| Provider | Hard limit | On by default | At the limit | Usage data |
|---|---|---|---|---|
| Vercel Pro | Pause Production Deployments | $200 budget with alerts; pausing off | Every project on the team returns a 503 | Checked every few minutes |
| OpenAI | Hard spend limit, per organization or project | You turn it on | Requests return a 429 | No delay given |
| Anthropic | Tier cap, plus your own organization and workspace limits | Tier cap: $500 on Start, $1,000 on Build | Requests fail until you raise the limit or the month resets | Within about 5 minutes |
| Google Cloud | Spend cap budgets (Preview) for Gemini API, Cloud Run and a few others | No budget until you create one | That service pauses for the project | Hours, sometimes over 24 |
| Firebase | Spend caps (Preview) for AI Logic, App Hosting, Functions and Extensions | You get a prompt for an alerts-only budget | That service pauses for the rest of the month | Several minutes for caps |
| AWS | Budget actions can stop EC2 and RDS and deny new resources | Anomaly emails at $100 and 40% over expected | Email, plus the action if you set one | Up to 3 times a day |
| Supabase Pro | Spend Cap on usage items | On | That usage item stops until the next cycle | Not documented |
| Neon | None; alerts at 80% and 100% | Off | Projects keep running | Checked every 15 minutes |
| Railway | Hard usage limit, $10 minimum | Not documented for compute | All workloads go offline | Not documented |
| Cloudflare | None; a CPU limit per Worker | $10 alert on eligible accounts | One email | Once a day |

### Settings to change at each provider

- **[Vercel](https://vercel.com/docs/spend-management):** in **Settings › Billing › Spend Management**, turn on **Pause Production Deployments** if an outage costs you less than the bill would. Vercel then pauses production for every project on the team, and you resume each project by hand. Storage, AI Gateway and v0 keep billing while paused. A webhook at 50%, 75% and 100% lets you pause one project with your own code.
- **[OpenAI](https://developers.openai.com/api/docs/guides/spend-limits):** in **Project settings › Limits**, set a monthly spend limit and turn on **Enforce a hard limit**. A limit per project stops one app from draining the budget of the others.
- **[Anthropic](https://platform.claude.com/docs/en/api/rate-limits):** set an organization limit under **Billing › Spend limits**, then a limit per workspace with an email notification. Anthropic doesn't let you limit the default workspace, so give each app its own.
- **[Google Cloud and Firebase](https://firebase.google.com/docs/projects/billing/spend-caps):** create a spend cap budget for each project and service that has one, such as the Gemini API or Cloud Run. Restrict each API key to the APIs it needs; the €54,000 bill came from a browser key with no API restrictions.
- **[AWS](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html):** add a budget action that applies a deny policy or stops EC2 and RDS instances. Lambda, S3 and Bedrock keep running under it.
- **[Supabase](https://supabase.com/docs/guides/platform/cost-control):** leave the Spend Cap on. It covers egress, storage, monthly active users and function invocations, and leaves out compute, read replicas, IPv4 and point-in-time recovery.
- **[Neon](https://neon.com/docs/introduction/spending-notifications):** turn on spending notifications. To suspend computes at a limit, set per-project consumption quotas through the Neon API.
- **[Railway](https://docs.railway.com/pricing/cost-control):** set a hard limit on the workspace's **Usage** page. Railway takes every workload offline at the limit and redeploys them when you raise it.

## Close the holes a limit leaves open

Three of the largest bills this year started with a key or an endpoint left open: the €54,000 Firebase browser key, an [$18,000 bill](https://news.ycombinator.com/item?id=47866293) from a public Cloud Run service with a $7 budget, and [$82,314 in 48 hours](https://www.reddit.com/r/googlecloud/comments/1reqtvi/) from a stolen Gemini key on an account that spent $180 a month. Restrict browser keys to their APIs and domains, keep server keys out of client code and published apps, and rotate any key you've pasted somewhere public.

Give each app its own project, workspace or key at each provider. A per-project limit then stops one app without taking down the rest, and you can see which app ran up the bill.

## Catch the slow creep

A hard limit stops a spike. A bill that grows 10% a month stays under the cap you'd set. A developer on r/nextjs [described this](https://www.reddit.com/r/nextjs/comments/1vxqr53/how_do_you_keep_an_eye_on_your_vercel_neon_bill/): preview deployments of merged branches and leftover Neon branches pushed the Vercel and Neon bill up 10 to 15% a month.

You catch creep by comparing each provider's spend week over week, and each app's margin month over month. OpenProfit reads daily costs from Vercel, Neon, OpenAI, Anthropic, Railway, Cloudflare and other providers, and runs two alert rules after each sync:

- **Cost spike:** a provider's spend yesterday passed $5 and more than doubled its daily average over the seven days before.
- **Margin floor:** an app's margin over the last seven days fell under 60%, or under the floor you set.

Each alert goes out by email, Slack, webhook or SMS. OpenProfit reads the same billing data as the providers, so it reports a spike the day after at the earliest. For a 13-hour spike, the provider's hard limit is the protection that works.

## Set these today

- Turn on a hard limit at each provider that has one, per project where you can.
- Set each cap below what you can afford to lose, since enforcement lags by minutes.
- Restrict each API key to the APIs and domains it needs.
- Give each app its own project, workspace or key.
- Watch spend per provider by week and margin per app by month.

[Get alerts in Slack, at your endpoint or by SMS](/docs/alerts) shows how to send OpenProfit's alerts to your channels.
