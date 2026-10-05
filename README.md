# OpenProfit

Revenue, costs and profit for every software product you run, in one place. Connect Stripe or Polar for revenue and the services you pay for (OpenAI, Anthropic, Vercel, Cloudflare) for costs. The overview shows this month's profit per product; a weekly email keeps you current.

Open source under the MIT license. Self-host in one container, or use the hosted version.

## Self-host

One container with SQLite on a volume. You need Docker and a 32-byte secret for encrypting provider keys.

Generate the secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Run the image:

```bash
docker run -d \
  --name openprofit \
  -p 3000:3000 \
  -v openprofit_data:/app/data \
  -e SECRET_KEY=your_secret_here \
  -e APP_URL=http://localhost:3000 \
  ghcr.io/openprofit-dev/openprofit:latest
```

Open `http://localhost:3000/login` and enter your email. Without an email provider, the sign-in link prints in the container log:

```bash
docker logs openprofit
```

Set `RESEND_API_KEY` and `EMAIL_FROM` to send links and the weekly email by mail instead.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `SECRET_KEY` | Yes | | 32 random bytes, base64. Encrypts provider credentials and signs sessions |
| `APP_URL` | Yes | `http://localhost:3000` | Public URL of this instance, used in sign-in links |
| `DATABASE_URL` | No | `./data/openprofit` | A `postgres://` URL, or a directory for the embedded Postgres (PGlite) |
| `DATABASE_AUTH_TOKEN` | No | | Token for a hosted libsql database |
| `RESEND_API_KEY` | No | | Sends sign-in links and the weekly email through Resend |
| `EMAIL_FROM` | No | | Sender address, for example `OpenProfit <mail@your_domain>` |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | No | | Adds "Sign in with GitHub" |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | | Adds "Sign in with Google" |
| `SYNC_SCHEDULER` | No | `on` | Set to `off` to disable the in-process sync and weekly-email jobs |
| `APP_MODE` | No | `selfhost` | `cloud` enables the pricing page and plan limits |

## Connectors

Each connector takes a read-only key you create in the provider's dashboard. The connect page links to the right settings page and lists the permissions to tick. Keys are stored encrypted with `SECRET_KEY`.

| Provider | Data | Key |
| --- | --- | --- |
| Stripe | Balance transactions, active subscriptions (MRR, customers) | Restricted key with read access to balance, balance transaction sources, charges and subscriptions |
| Polar | Daily revenue and net revenue, MRR, active subscriptions | Organization access token with `organizations:read` and `metrics:read` |
| OpenAI | Daily cost by project and line item | Organization admin key |
| Anthropic | Daily cost by workspace and description | Admin key (organization accounts) |
| Vercel | Daily charges per project (FOCUS format) | Access token scoped to the team |
| Cloudflare | Billable usage, or invoices where usage is unavailable | API token with Billing: Read and Account Settings: Read |

Costs with no API (Supabase, Resend, domains) go in as flat monthly or yearly amounts on the Costs page.

## Local development

Requires Node 22 and pnpm.

```bash
pnpm install
cp .env.example .env   # then set SECRET_KEY
pnpm db:push           # creates the SQLite schema
pnpm db:seed           # one workspace with twelve months of demo data
pnpm dev
```

After signing in once at `http://localhost:3000/login`, attach the demo workspace to your user:

```bash
pnpm db:seed --owner=you@example.com
```

Checks:

```bash
pnpm check             # biome
npx tsc --noEmit
```

## Design

Tokens and utilities live in `src/styles.css`.

## License

MIT
