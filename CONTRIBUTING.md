# Contributing to OpenProfit

Issues and pull requests are welcome. Connectors are the most useful contribution. Most of this guide covers how to build one: the files to touch, the data to return, and how to test against a real account. To ask for a connector without building it, [open a connector request](https://github.com/lobbystack/openprofit/issues/new?template=connector.yml).

## Set up a development environment

You need Node 22 and pnpm. Install the dependencies, copy `.env.example`, and generate a key with the `node` line:

```bash
pnpm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
pnpm dev
```

Paste the key into `SECRET_KEY` in `.env` before you start the server. It encrypts provider credentials, and saving a connection fails without it. The app runs at http://localhost:3000.

To sign in without an email provider, enter any address on `/login`. With `RESEND_API_KEY` unset, the server prints the sign-in link to the `pnpm dev` output. Open it, then create a workspace on the onboarding page.

For a workspace with a year of demo numbers, stop `pnpm dev` and run `pnpm db:seed`. After you sign in once, `pnpm db:seed --owner=you@example.com` adds your user to it.

### The local database

Local development uses PGlite, an embedded Postgres stored in `./data/openprofit`. Only one process can open that directory at a time:

- Stop `pnpm dev` before you run `pnpm db:seed` or any script that imports `src/db`, or the script hangs
- Stop processes with Ctrl+C. A `kill -9` during a write can corrupt the directory
- End one-off scripts with `process.exit(0)`, or PGlite keeps them running
- Delete `./data/openprofit` to start over

## Run the checks

CI runs three commands on every pull request. Run them before you push:

```bash
pnpm check        # Biome lint and format
npx tsc --noEmit  # typecheck
pnpm build        # production build
```

`npx biome check --write src` fixes formatting. Biome uses tabs and double quotes. The repository has no test suite, so check your change in the browser as well.

## Build a connector

A connector is one file in `src/connectors/` that reads money lines from one provider's API. A revenue connector implements `fetchRevenue` and can add `fetchSnapshots`. A cost connector implements `fetchCosts`. Both implement `verify`. The types live in [`src/connectors/types.ts`](src/connectors/types.ts).

### How a sync calls your connector

[`src/server/sync.server.ts`](src/server/sync.server.ts) runs each sync in this order:

1. Decrypts the stored credentials and calls `fetchRevenue` and `fetchCosts` with a range of UTC days. The first sync and **Sync now** ask for the plan's history: 730 days, or 365 on the free hosted plan. Later syncs start 3 days before the last successful sync, so a range after an outage covers the days it missed. They never reach back further than the plan's history.
2. Converts each line to the workspace's base currency at the European Central Bank rate for the line's date.
3. Upserts each line by its `externalId`. On a conflict it overwrites every field: amounts, date, currency, `service`, sub-unit, label and product.
4. Deletes stored lines the fetch no longer returned, inside the connector's `historyDays` window. See [History and deletion](#history-and-deletion).
5. Calls `fetchSnapshots` with today's date, adds up values for the same day and metric, and upserts one value per connection, day and metric.

A sync is due when the connection's cadence has passed: every 60 minutes on a self-hosted instance, or by plan on the hosted version. Saving a connection runs the first sync at once.

If your connector throws, the sync stops, the connection's status becomes `error`, and the error message appears on the connections page. The scheduler retries an errored connection 1 hour after the failed attempt, then doubles the wait after each further failure, up to 24 hours. It stops retrying when the provider rejected the key: a 401, or a 403 without `Retry-After`. Those connections wait until someone clicks **Sync now**. A paused connection stays paused after **Sync now**, whether the sync succeeds or fails.

### Files to touch

Use `railway` as the reference: `grep -rn railway src README.md` finds every place a provider appears. For a new provider with the id `example`:

- [ ] `src/connectors/example.ts`: the connector, passed to `register()`
- [ ] `src/connectors/index.ts`: add `import "./example";`. Importing the file registers it. The UI doesn't follow this order, but keep revenue providers before cost providers
- [ ] `src/components/provider-logo.tsx`: add `example` to `PROVIDERS` with `v1: true`. The connections page builds its list of providers from this map, so without an entry users can't reach your connect form. If [Simple Icons](https://simpleicons.org) has the logo, import `siExample` and set `path: siExample.path`. Otherwise set `path` to a hand-drawn path on a 24 by 24 grid, or leave it out to show the name as a wordmark. If the entry already exists with `v1: false`, flip it to `true`
- [ ] `src/routes/app/connections.$id.tsx`: if your connector sets sub-units, add their name to `UNIT`, for example `example: "workspace"`
- [ ] `src/content/integrations/example.md`: the public integration page. Copy the front matter keys from `railway.md`: `title`, `name`, `kind`, `summary`, `description`. Cover what the connector reads, how to create the key, and how its lines map to products
- [ ] `src/lib/content.ts`: add `"example"` to the slug list in `INTEGRATIONS`. A page missing from that list doesn't render. The sitemap and the markdown index read the same list
- [ ] `src/docs/connectors.md`: add a row to the table in "What each connector reads", and a line under "Assign costs to products" if the connector sets sub-units
- [ ] `README.md`: add a row to the connectors table, and remove the provider from the "are next" sentence below it
- [ ] `src/components/landing/connectors.tsx`: add the id to `TILES` if the landing page should show it
- [ ] `src/content/changelog.md`: add an entry under the release date

A few pages name providers in their copy: `src/content/home.md`, `src/components/landing/features.tsx`, `src/components/landing/changelog.tsx`, the description in `src/routes/integrations.index.tsx`, and the comparison pages in `src/content/compare/`. Update those you can, or say in the pull request which ones you left.

### A cost connector skeleton

This skeleton follows `openai.ts` and `vercel.ts`. The API shape is invented; the types, helpers and registration are the real ones:

```ts
import { register } from "./registry";
import {
	type CostLine,
	type Credentials,
	getJson,
	type SyncRange,
	toCents,
} from "./types";

const BASE = "https://api.example.com/v1";
const headers = (c: Credentials) => ({ Authorization: `Bearer ${c.token}` });

type Page = {
	items: {
		day: string; // YYYY-MM-DD
		project_id: string | null;
		project_name: string | null;
		service: string;
		amount_usd: number; // dollars, decimal
	}[];
	next_cursor: string | null;
};

export const example = register({
	id: "example", // lower case; the URL slug and the PROVIDERS key
	name: "Example",
	kind: "cost",
	auth: {
		kind: "key",
		// Each field becomes an input. Its `name` is the key in `Credentials`.
		fields: [
			{
				name: "token",
				label: "Read-only API token",
				placeholder: "ex_…",
				secret: true,
			},
		],
		// "Create a key" links here; `scopes` lists what to tick.
		createUrl: "https://example.com/settings/tokens",
		scopes: ["Billing: read"],
	},
	// Runs on Test and again on Connect. The label names the connection.
	async verify(c) {
		const me = await getJson<{ name: string }>(`${BASE}/me`, {
			headers: headers(c),
		});
		return { label: me.name };
	},
	// range.from and range.to are UTC days, both included.
	async fetchCosts(c, range: SyncRange) {
		const out: CostLine[] = [];
		let cursor: string | null = null;
		do {
			const url = `${BASE}/costs?from=${range.from}&to=${range.to}${cursor ? `&cursor=${cursor}` : ""}`;
			const page: Page = await getJson<Page>(url, { headers: headers(c) });
			for (const r of page.items) {
				if (!r.amount_usd) continue;
				out.push({
					// Same day, project and service: same id, so a re-sync
					// overwrites the line.
					externalId: `${r.day}:${r.project_id ?? "none"}:${r.service}`,
					date: r.day,
					currency: "USD",
					amountCents: toCents(r.amount_usd),
					service: r.service,
					subUnitId: r.project_id ?? undefined,
					subUnitLabel: r.project_name ?? undefined,
				});
			}
			cursor = page.next_cursor;
		} while (cursor);
		return out;
	},
});
```

### The data contract

Every line, revenue or cost, follows these rules:

- **Amounts**: integer cents in the currency the provider reports. `toCents()` converts a decimal amount. Don't convert currencies; the sync does that
- **`currency`**: an upper-case ISO 4217 code such as `USD`. The sync compares it with the base currency as a string and fetches rates for it from Frankfurter. An unknown code fails the sync
- **`date`**: `YYYY-MM-DD` in UTC. `dayOf()` converts a Unix timestamp in seconds. The date sets the exchange rate and the month the line counts toward
- **`externalId`**: stable and unique within the connection. The sync upserts by it, so a re-sync replaces a line instead of adding a second one. Build it from the provider's own id, or from every dimension of an aggregate (`openai.ts` uses bucket start, project and line item). Changing the format later duplicates every past line
- **Granularity**: return one line per day when the API allows it. If the API aggregates by month, return each month that overlaps the range, dated the first of the month, as `railway.ts` does. A 3-day tail then still refreshes the current month
- **Zero amounts**: leave out lines of 0 cents. The sync deletes a stored line once the fetch stops returning it, so a share that drops to 0 disappears on its own

On a conflict, the sync overwrites every field of the stored line, the product included.

#### History and deletion

After a fetch succeeds, the sync deletes the connection's stored lines that the fetch didn't return, but only lines dated inside the sync range and inside the connector's `historyDays`. Set `historyDays` to the number of days back your fetch returns complete results:

- **Unset**: the API returns the whole range, as Stripe's balance transactions do
- **A number**: the API keeps less history than the range asks for. `openrouter.ts` sets 30, because the activity endpoint covers the last 30 days. Lines older than that stay as they are
- **`0`**: a fetch never proves a line is gone, so the sync deletes nothing. `lemonsqueezy.ts` sets it: a refund on an old order only shows up when the connector rereads that order

A fetch that returns no lines at all deletes nothing, whatever the range. Providers sometimes answer an outage with an empty list, and a 2-year range would lose its history. The next fetch that returns lines cleans up.

#### Revenue lines

`RevenueLine` carries four amounts. They must satisfy `netCents = grossCents - feesCents - refundsCents`:

- **`grossCents`**: what the customer paid, 0 or more
- **`feesCents`**: what the provider kept
- **`refundsCents`**: money returned, as a positive number
- **`netCents`**: what you keep. It's negative on a refund line

None of them include sales tax or VAT. Return the tax in **`taxCents`**: the tax the customer paid, whether the price added it on top or included it. On a refund line, return the tax handed back as a negative number. Leave it out when the provider doesn't report tax; it defaults to 0. If the provider files and pays the tax as merchant of record, as Paddle does, or the app stores do for RevenueCat, set `remitsTax: true` on the connector. The overview reports the rest as tax the seller files.

The overview sums `netCents`, and `taxCents` for **Tax collected**. The sync stores the other amounts and `kind`, but no page shows them yet. Set `kind` to `subscription` or `one_time` when the provider tells you, and `other` when it doesn't. Skip cash movements such as payouts and transfers; `stripe.ts` lists the types it skips.

#### Cost lines

`amountCents` is what the provider charged, as a positive number. `service` is a short label for the product or line item, such as `CPU` or a model name.

#### Sub-units and product mapping

Set `subUnitId` when the provider groups money by something a user would assign to a product: a Paddle product, an OpenAI project, a Vercel project, a Cloudflare zone, a sending domain. Use the provider's id, which must stay the same across syncs. Revenue and cost lines both map this way.

The connection page lists each sub-unit seen this month with its amount, and the user picks a product for each. Lines without a `subUnitId` go to the product picked at the top of that page. The sync stores `subUnitLabel`, and the page shows it next to the id, so set it when the API returns a name. Never put a secret in it: `firecrawl.ts` shows the last 4 characters of an API key.

#### Snapshots

`fetchSnapshots(creds, date)` returns point-in-time values for `date`, which is always today. It runs at the end of every sync. It returns these metrics:

- **`mrr_base_cents`**: monthly recurring revenue in cents, with `currency` set to the currency of the amount. Despite the name, return it in the provider's currency; the sync converts it. Without `currency`, the sync assumes the base currency
- **`customers`**: the count of paying customers, with no currency

Return one `mrr_base_cents` snapshot per currency. `mrrSnapshots()` in `types.ts` builds them from a map of currency to cents. The sync converts each one and adds up snapshots with the same metric, so several projects or currencies give one total.

The sync stores one value per connection, day and metric, so a second sync on the same day overwrites the first. History starts on the day the connection is added. The overview takes the latest value in each month for each connection and adds the connections together.

#### `verify`

`verify` makes one cheap authenticated call and returns `{ label }`: the account, organization or team name. The connect form shows the label after **Test**, and the connections list shows it next to the provider.

#### Errors

Use `getJson()` for JSON requests. On a non-2xx response it throws a `ConnectorError` with the status code and the first 200 characters of the body. It sets `auth` on a 401, or a 403 without `Retry-After`, and the scheduler then stops retrying the connection. Error tracking leaves out `ConnectorError`, because its message holds the provider's response. For other failures, throw `new ConnectorError(message, status)` yourself, as `railway.ts` does for GraphQL errors and a missing workspace. Users read these messages on the connect form and the connections page. Write them for the user: "No team on this token. Set a team id."

#### Pagination and rate limits

Return every line in the range, across all pages. Each existing connector loops until the API reports no more pages: Stripe's `has_more` and `starting_after`, OpenAI's and Anthropic's `next_page`.

A first sync covers two years, so split the range to fit the API's limits. `polar.ts` splits it into chunks of at most 366 days, and `openai.ts` and `anthropic.ts` into 31-day windows.

`getJson()` retries a 429, and a 403 that carries `Retry-After`, up to 4 times. It waits the seconds `Retry-After` gives, or 5 seconds doubling after each try, and never more than 30 seconds at once. Use it for every request so a long backfill survives rate limits.

### Credentials

Ask for the narrowest key the provider offers:

- Ask for a read-only or restricted key when the provider has one. If the billing API needs an admin key, as OpenAI's and Anthropic's do, say so in `scopes` and on the integration page
- List in `scopes` the exact permission names users tick in the provider's dashboard, for example `Balance: read`. The connect form shows them under **Permissions**, next to the `createUrl` link
- Mark API keys and tokens `secret: true` so the input masks them. Leave ids such as an account or team id unmasked
- Mark a field `optional: true` only when the connector can work without it, for example by looking up the default account as `vercel.ts` and `cloudflare.ts` do. The form doesn't require optional fields, and an empty one arrives missing or as an empty string, so read it with `c.teamId?.trim()`
- Give a field `options` to render a select, such as a plan the API can't report. The first option shows by default. On a required field, make the first option `{ value: "", label: "Pick your plan" }` so the form waits for a choice, as `resend.ts` does
- The server trims every value, then encrypts the credential object with AES-GCM and `SECRET_KEY` before it stores it. Your connector receives the decrypted object

Never log credentials, put them in a URL, or include them in an error message. Send them in headers.

### Test against a real account

Call the connector from a one-off script before you try the UI. Importing `#/connectors` doesn't open the database, so the script runs alongside `pnpm dev`. Save it as `check.ts` at the repository root and keep it out of your commit:

```ts
import { connector } from "#/connectors";

const c = connector("example");
const creds = { token: process.env.EXAMPLE_TOKEN ?? "" };
console.log(await c.verify(creds));
const lines = await c.fetchCosts?.(creds, {
	from: "2026-09-01",
	to: "2026-09-30",
});
console.table(lines?.slice(0, 20));
console.log(lines?.length, "lines");
```

Run it with `EXAMPLE_TOKEN` in `.env`:

```bash
npx tsx --env-file=.env check.ts
```

Compare the totals with the provider's billing page for the same month. Run it twice and check that both runs return the same `externalId` values.

Then test the full flow in `pnpm dev`:

1. Open **Connections**, pick your provider, paste the key and click **Test**. Check the label.
2. Click **Connect**. The first sync runs before the page returns. If it fails, the dev server log shows `[sync] first sync example:` with the error.
3. On the connections list, check the status and this month's amount.
4. Open the connection. Check the sub-units and assign one to a product.
5. On the overview, check that revenue or costs moved, and that the product's numbers include the line.
6. Click **Sync now** and check that the amounts stay the same.

### Open the pull request

In the description, include:

- Links to the provider's API reference for each endpoint you call, and to its page on creating keys
- The key type and permissions you tested with
- What you checked: the date range, how your totals compared with the provider's own figures, and any differences you know of, such as plan fees the API leaves out
- A screenshot of the connection page with sub-units, or of the overview, with amounts you're happy to share
- The files from the checklist you didn't update, and why

## Report a security issue

Email hello@openprofit.dev. Don't open a public issue.
