---
title: AI token cost per user: how to work it out before you price
description: What each user of your AI app costs in tokens, with October 2026 Claude and OpenAI prices, worked examples and five ways to keep heavy users profitable.
date: 2026-10-19
author: Raphael Morency
---

# AI token cost per user: how to work it out before you price

On a $20 plan, a user who sends 20 chat messages a day to Claude Sonnet 5.5 costs you about $5 a month in tokens. A user who also runs five agent tasks a day costs about $62. Both pay $20, and your OpenAI or Anthropic bill shows one total for the two of them.

You can work out the cost of each user before you set a price, with four numbers per feature and the model's price list.

## The formula

Every API call costs its input tokens at the input price plus its output tokens at the output price:

```text
Cost of one call = input tokens × input price + output tokens × output price
Cost per user per month = calls per month × cost of one call
```

Prices are per million tokens, so divide by 1,000,000. Cached input, which a provider bills at a lower rate when you resend the same prompt prefix, gets its own line when you use prompt caching.

## What tokens cost in October 2026

Standard prices per million tokens, from the [Claude pricing page](https://claude.com/pricing) and the [OpenAI pricing page](https://developers.openai.com/api/docs/pricing) on October 19, 2026:

| Model | Input | Cached input | Output |
|---|---|---|---|
| Claude Opus 5.5 | $4.00 | $0.20 | $20.00 |
| Claude Sonnet 5.5 | $2.00 | $0.10 | $10.00 |
| Claude Haiku 5.5 | $0.10 | $0.01 | $0.50 |
| GPT-6 Astra | $10.00 | $1.00 | $50.00 |
| GPT-6.1 Sol | $2.00 | $0.10 | $10.00 |
| GPT-6 Luna | $0.10 | $0.01 | $0.50 |

Haiku 5.5's price applies to prompts up to 100,000 tokens, and Claude's cache reads assume the five-minute cache. Output costs five times the input on every model here, so a feature that writes long answers costs more than one that reads long documents.

## Three features, priced

Take three common features and an estimate of their tokens per call:

| Feature | Input tokens | Output tokens | Sonnet 5.5 | Haiku 5.5 | Opus 5.5 |
|---|---|---|---|---|---|
| Chat reply | 2,000 | 500 | $0.009 | $0.0005 | $0.018 |
| Summary of a 20-page document | 20,000 | 1,000 | $0.05 | $0.0025 | $0.10 |
| Agent task, 10 steps | 150,000 | 8,000 | $0.38 | $0.019 | $0.76 |

GPT-6.1 Sol costs the same as Sonnet 5.5 on these calls, and GPT-6 Luna the same as Haiku 5.5.

The agent task costs 40 times a chat reply because each step sends the conversation so far back to the model. Ten steps over a context that grows to 25,000 tokens add up to 150,000 input tokens. A long chat thread grows the same way, so measure your own average instead of using 2,000.

## Light, typical and heavy users

Put the three features on a $20 monthly plan built on Sonnet 5.5:

| User | Usage per month | Token cost | Left from $20 after Stripe's fee |
|---|---|---|---|
| Light | 150 chat replies | $1.35 | $17.63 |
| Typical | 600 chat replies and 10 summaries | $5.90 | $13.08 |
| Heavy | 600 chat replies and 150 agent tasks | $62.40 | −$43.42 |

Stripe's fee on a $20 subscription paid with a US card is 2.9% + 30¢ plus 0.7% for Stripe Billing, or $1.02.

One heavy user wipes out the margin of more than three typical users. In most apps a small group of users drives most of the token spend, so the average cost per user hides the problem. Look at the cost of your top 10% of users before you look at the average.

## Measure it in your own app

Your provider's usage page shows spend by project, workspace or API key, by day. It doesn't know your users. Every API response carries its token counts, so record them next to the user who made the call:

- **OpenAI** returns `usage.input_tokens`, `usage.output_tokens` and `usage.input_tokens_details.cached_tokens` on the Responses API.
- **Anthropic** returns `usage.input_tokens`, `usage.output_tokens`, `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens` on the Messages API.

Store one row per call with the user, the feature, the model and those counts. Multiply by the price table once a day, and you have cost per user, per feature and per plan. Compare the total with your provider's usage page each month, and you'll catch calls your logging missed.

## Keep heavy users profitable

Once you know the cost per user, five levers bring it down or make heavy users pay for it:

- **Route to a smaller model.** Haiku 5.5 costs a twentieth of Sonnet 5.5. Send classification, extraction and short replies to it, and keep the large model for the hard requests.
- **Cache the repeated prefix.** On Sonnet 5.5, a cache read costs $0.10 per million tokens against $2.00 for fresh input. System prompts, tool definitions and long documents a user asks about several times are the usual candidates.
- **Batch what can wait.** Anthropic's [Message Batches API](https://platform.claude.com/docs/en/build-with-claude/batch-processing) and OpenAI's [Batch API](https://developers.openai.com/api/docs/guides/batch) charge 50% less for requests that can finish later. OpenAI gives batches up to 24 hours.
- **Cap or meter the expensive feature.** Include a monthly number of agent tasks in each plan, then sell more as credits or charge per task above the quota.
- **Price from the heavy user.** If a plan has no cap, set its price from what your 90th-percentile user costs.

## Watch the total for each app

Per-user logging tells you who costs what. You still need the provider's own total, because that's what lands on your card: retries, failed calls and test traffic all count.

OpenProfit reads that total from OpenAI, Anthropic, OpenRouter and xAI every day, split by project, workspace or API key, and puts it next to the app's revenue from Stripe or Polar. You see each app's margin after tokens, and an alert reaches you by email, Slack or SMS when a provider's daily spend doubles against its average for the week before. [Claude API usage and costs by workspace](/integrations/anthropic) and [OpenAI usage dashboard by project](/integrations/openai) show what each connector reads.
