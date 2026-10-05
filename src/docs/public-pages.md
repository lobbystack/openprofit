# Public pages

Each product can have a public page at `/p/<workspace>/<product>`. Pick what it shows on the Products page:

| Mode | Shows |
| --- | --- |
| Off | Nothing. The URL returns 404 |
| Full | Revenue, costs, profit and the monthly chart |
| Revenue | Revenue and the chart, no costs |
| Percent | Month-over-month change only, no amounts |

Pages are server-rendered from the same data as the dashboard and update on every sync. Each one carries a "Built with OpenProfit" line.
