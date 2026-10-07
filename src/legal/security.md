# Security

To show your profit, OpenProfit needs a key for each provider you connect. This page lists the key each provider asks for, what OpenProfit does with it, and how to keep keys on your own server instead.

## What happens to a key

When you press **Test**, OpenProfit calls the provider once to check the key works. When you press **Connect**, it encrypts the key and saves it.

- **Encrypted at rest.** OpenProfit encrypts keys with AES-256-GCM. The encryption key lives in the server's environment, apart from the database, so a copy of the database can't decrypt them.
- **Decrypted only to sync.** The server decrypts a key when it syncs that connection. It never sends a key back to your browser, and the connection page doesn't show it after you save.
- **Used only to read.** Every request OpenProfit sends a provider reads billing or usage data. OpenProfit never creates, changes, refunds or deletes anything at a provider.
- **Deleted with the connection.** Removing a connection deletes its key and every line it synced. Revoke the key at the provider as well.

## What OpenProfit stores

For each line a provider reports, OpenProfit keeps the date, the amount and currency, fees, refunds and tax, the provider's id for the line, and the project or workspace it belongs to. From revenue sources it also keeps daily MRR and subscription counts.

It doesn't store your customers' names, emails or card details.

## The key each provider needs

Give each key the least access its provider allows. These providers offer keys limited to reading the data OpenProfit needs:

| Provider | Key | Access to give it |
| --- | --- | --- |
| Stripe | Restricted key | Read on Balance, Balance transaction sources, Charges, Checkout Sessions, Invoices and Subscriptions |
| Polar | Organization access token | `organizations:read`, `metrics:read` |
| Paddle | API key | `transaction.read`, `adjustment.read`, `metrics.read` |
| RevenueCat | Secret API key (v2) | `project_configuration:projects:read`, `charts_metrics:overview:read` |
| Cloudflare | API token | Account · Billing · Read and Account · Account Settings · Read |
| DigitalOcean | Personal access token | `billing:read`, `account:read` |
| GitHub | Fine-grained token | Administration: read for an organization, or Plan: read for a personal account |
| Twilio | Restricted API key | `/twilio/billing/usage/read` |
| MongoDB Atlas | Service account | The Organization Billing Viewer role |

These providers have no read-only key for the data OpenProfit needs, so the key you create can do more than read:

| Provider | Key | What else the key can do |
| --- | --- | --- |
| OpenAI | Admin key | Manage your organization's projects, members and API keys |
| Anthropic | Admin key | Manage your organization's workspaces, members and API keys |
| OpenRouter | Management key | Create and delete API keys |
| xAI | Management key | Manage your team's API keys |
| Neon | Organization API key | Manage your organization's projects and databases |
| Lemon Squeezy | API key | Anything the Lemon Squeezy API allows, since its keys have no scopes |
| Resend | Full-access API key | Send email and manage domains. Sending-only keys can't read usage |
| Vercel | Access token scoped to one team | Anything your role on that team allows. Create it from an account with the Billing role |
| Railway | Account or workspace token | Deploy and change services. A workspace token limits it to one workspace |
| Firecrawl | API key | Run scrapes on your credits |

OpenProfit uses these keys the same way as the others and only reads with them. If that's more access than you want to hand over, self-host OpenProfit so the key stays on your server, or skip that connector and add the bill as a flat cost.

## Self-hosting

OpenProfit is open source under the MIT license, and the hosted version runs the same code. Self-host it and your keys stay on your server: one Docker container with Postgres inside, encrypting with a key you generate. The [self-host guide](/docs/self-host) walks through it.

You can read every line that touches a key. Encryption is in [`src/lib/crypto.ts`](https://github.com/lobbystack/openprofit/blob/main/src/lib/crypto.ts), and each provider call is in [`src/connectors/`](https://github.com/lobbystack/openprofit/tree/main/src/connectors).

A self-hosted copy sends us nothing unless you switch on its daily usage ping, which carries a version number and counts, never keys or amounts.

## Your account

- You sign in with an email link, GitHub or Google. OpenProfit stores no passwords.
- Product analytics record what you do in the app, never amounts, keys or data from your providers. Switch them off in **Settings**.
- The hosted version runs on Railway in the United States. The [Privacy Policy](/privacy) lists every company that handles your data, and the [Cookie Policy](/cookies) lists each cookie.
- To delete a workspace or your account, email hello@openprofit.dev.

## Report a vulnerability

Email hello@openprofit.dev with the steps to reproduce it, instead of opening a public GitHub issue.
