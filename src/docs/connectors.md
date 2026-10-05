# Connectors

Each connector takes a read-only key you create in the provider's dashboard. The connect page links to the right settings page, lists the permissions to tick and tests the key before saving. Keys are stored encrypted with `SECRET_KEY`.

The first sync pulls two years of history (one on the free hosted plan). Later syncs pull the last three days and overwrite what changed.

| Provider | Data | Key |
| --- | --- | --- |
| Stripe | Balance transactions, active subscriptions (MRR, customers) | Restricted key with read access to balance, balance transaction sources, charges and subscriptions |
| Polar | Daily revenue and net revenue, MRR, active subscriptions | Organization access token with `organizations:read` and `metrics:read` |
| OpenAI | Daily cost by project and line item | Organization admin key |
| Anthropic | Daily cost by workspace and description | Admin key (organization accounts) |
| Vercel | Daily charges per project | Access token scoped to the team |
| Cloudflare | Billable usage, or invoices where usage is unavailable | API token with Billing: Read and Account Settings: Read |
| Railway | Monthly CPU, memory, egress, disk and backup usage per project, priced at Railway's published rates | Account or workspace token |

## Products

Costs reach a product through the provider's own grouping: an OpenAI project, a Vercel project, an Anthropic workspace, a Railway project, a Cloudflare zone. Open a connection to assign each one. Lines with no grouping, and all revenue from a connection, go to the product set at the top of that page. A workspace with one product gets everything by default.

## Flat costs

Services without an API (Supabase, Resend, domains) go in as monthly or yearly amounts on the Costs page. They count from their start date and spread yearly amounts over twelve months.

## Currency

Each workspace has one base currency. Lines in other currencies convert at the European Central Bank rate for their date.
