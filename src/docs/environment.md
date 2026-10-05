# Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `SECRET_KEY` | Yes | | 32 random bytes, base64. Encrypts provider credentials and signs sessions |
| `APP_URL` | Yes | `http://localhost:3000` | Public URL of this instance, used in sign-in links |
| `DATABASE_URL` | No | `./data/openprofit` | A `postgres://` URL, or a directory for the embedded Postgres |
| `RESEND_API_KEY` | No | | Sends sign-in links and the weekly email through Resend |
| `EMAIL_FROM` | No | | Sender address, for example `OpenProfit <mail@your_domain>` |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | No | | Adds "Sign in with GitHub" |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | | Adds "Sign in with Google" |
| `SYNC_SCHEDULER` | No | `on` | `off` disables the in-process sync, weekly-email and telemetry jobs |
| `APP_MODE` | No | `selfhost` | `cloud` turns on plans, Polar billing and the cadence caps |
| `POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_INDIE`, `POLAR_PRODUCT_PRO`, `POLAR_WEBHOOK_SECRET` | Cloud only | | Polar organization token, product ids for the two paid plans, webhook secret for `/api/polar/webhook` |
| `TELEMETRY_URL` | No | `https://openprofit.dev/api/telemetry` | Where the optional usage ping goes |

## Telemetry

Off by default. Switch it on in Settings and the instance sends one ping a day: a hash of the secret key as an id, the version, and counts of workspaces, products and connections per provider. No names, no amounts, no emails.
