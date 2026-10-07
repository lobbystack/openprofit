---
title: Benchmarks
description: Monthly revenue, gross margin and cost shares of the products on OpenProfit, grouped by monthly recurring revenue (MRR). The numbers come from Stripe, OpenAI and the other providers' APIs.
---

## Download

- [benchmarks.csv](https://openprofit.dev/data/benchmarks.csv)
- [benchmarks.json](https://openprofit.dev/data/benchmarks.json)

Both files hold every published month, with one row per month, MRR band and metric. The columns are `month`, `band`, `metric`, `unit`, `n`, `p25`, `p50`, `p75` and `p90`, where `n` counts the workspaces in the cohort. A percentile is empty until enough workspaces back it (see Privacy). Revenue is in US dollars and the other metrics in percent of revenue. We add each new month to the same two files.

## License

You can share and adapt the data under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit it as:

> OpenProfit benchmarks, openprofit.dev/data, CC BY 4.0

## Methods

**Who's in it.** Workspaces on openprofit.dev with a revenue connection and revenue in the month. Self-hosted instances send us nothing, and we leave out the public demo. Owners can switch off **Benchmarks** in Settings. We leave their workspace out of every month we compute after that; months already published stay as they are.

**Bands.** We place each workspace by its MRR in US dollars at the end of the month: $0–1k, $1k–5k, $5k–20k or $20k+. A workspace whose connectors report no MRR goes by its revenue for the month.

**Metrics.** Each row in the files holds one of four metrics:

| Metric | What it measures |
| --- | --- |
| `revenue` | Revenue for the month after refunds, sales tax and processor fees, in US dollars |
| `gross_margin` | Revenue minus the costs connected providers report (hosting, AI APIs, email and the like), in percent of revenue |
| `total_costs` | Provider costs plus the flat costs the owner entered, in percent of revenue |
| `ai_costs` | OpenAI, Anthropic, OpenRouter and xAI costs, in percent of revenue |

Each cost metric counts the workspaces that had that kind of cost in the month.

**Privacy.** We publish a cohort once it has 10 workspaces or more, and then only its percentiles: the median always, the 25th and 75th from 12 workspaces, the 90th from 30. Each published value has at least 3 workspaces beyond it, so none sits close to one workspace's figure. The files and this page hold no workspace names or individual values.

**Currency.** OpenProfit converts each amount to the workspace's base currency at the European Central Bank rate for its day. For the benchmarks we convert that total to US dollars at the rate for the month's last day.

**Percentiles.** We use linear interpolation between the closest ranks, which matches numpy's default and Excel's PERCENTILE.INC.

**Schedule.** We compute each month on the 3rd of the next, after its last days have synced. Publishing starts with the first month in which 50 workspaces qualify.
