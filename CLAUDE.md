# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

OpenProfit: open-source finance dashboard for developers. Pulls revenue (Stripe, Polar) and costs (OpenAI, Anthropic, Vercel, Cloudflare, Railway) from provider APIs, assigns them to products, shows profit per product. One TanStack Start app serves the landing page, docs, marketing content and the dashboard. Hosted at openprofit.dev (Railway), self-hostable as one Docker image. Repo: github.com/lobbystack/openprofit. Operator: Lobbystack Inc.

## Commands

```bash
pnpm dev                 # http://localhost:3000
pnpm check               # Biome lint + format check (CI runs this)
npx biome check --write src   # apply formatting; Biome rewrites files to tabs/double quotes
npx tsc --noEmit         # typecheck (CI runs this)
pnpm build               # production build into .output (CI runs this)
pnpm db:generate         # write a migration after editing src/db/schema.ts
pnpm db:seed             # demo workspace; `pnpm db:seed --owner=you@example.com` attaches it to a user
```

There is no test suite. Verify changes in the browser and with a production build when touching bundling, the database or `src/start.ts`.

Production-build smoke test with a throwaway embedded DB:

```bash
PORT=3200 SYNC_SCHEDULER=off DATABASE_URL=/tmp/op-test node .output/server/index.mjs
```

Local sign-in without email: request a link on /login (or POST /api/auth/sign-in/magic-link) and read the URL from the dev server log. Same on Railway via `railway logs | grep magic-link`.

## Database

- Postgres everywhere through Drizzle (`src/db/schema.ts`, `src/db/auth-schema.ts`). `DATABASE_URL` starting with `postgres://` uses `pg`; anything else is a directory for **PGlite** (embedded Postgres, default `./data/openprofit`). Hosted uses Railway Postgres.
- Migrations in `./drizzle` run at import time of `src/db/index.ts` (skip with `SKIP_MIGRATIONS=1`). Don't use `drizzle-kit push`; PGlite rejects its multi-statement queries.
- **PGlite allows one process per data directory.** Running a script (`db:seed`, a tsx one-off) while `pnpm dev` is up hangs or fails. Killing a process mid-write (`kill -9`) can corrupt the directory. Stop dev cleanly first. One-off scripts must end with `process.exit(0)` or PGlite keeps them alive.
- PGlite is excluded from Vite `optimizeDeps` and externalized from the Nitro server bundle in `vite.config.ts`; bundling it drops its wasm/data files and the server crashes on start. Keep both.
- Money is integer cents. Each line stores the source amount and a `*_base_cents` amount in the workspace's base currency (Frankfurter/ECB daily rates, cached in `fx_rates`). Changing the base currency reconverts every line (`settings.functions.ts`).
- Every table carries `workspace_id`.

## Architecture

- **Server code split.** `*.functions.ts` export only `createServerFn` handlers (safe to import from components). `*.server.ts` hold server-only logic (db, secrets, node APIs) and must never be imported by client code. A plain exported helper in a `.functions.ts` file pulls the db into the client bundle and breaks the build; shared constants and schemas live in `src/lib/`. Server-only modules without the `.server` suffix (`src/db`, `src/lib/auth.ts`, `src/lib/crypto.ts`, connectors) start with `import "@tanstack/react-start/server-only"`. Components call mutations through `useServerFn` so a thrown redirect (expired session) navigates.
- **Workspace resolution.** `currentWorkspace()` (`src/server/workspace.server.ts`) picks the workspace from the `op_ws` cookie, falling back to the user's first membership, and redirects to /onboarding when there is none. All app server functions start with it.
- **Connectors** (`src/connectors/`): one file per provider implementing `verify`, and `fetchRevenue` / `fetchCosts` / `fetchSnapshots`, registered in `index.ts`. Credentials are AES-GCM encrypted with `SECRET_KEY` (`src/lib/crypto.ts`). Connector auth fields marked `optional` must not be `required` in the form.
- **Sync** (`src/server/sync.server.ts`): upserts lines by the provider's external id, so re-running a range is safe. First sync backfills 730 days (365 on the hosted free plan), later syncs reread the last 3 days. In-process croner scheduler (`scheduler.ts`): sync every 5 minutes for due connections, weekly email Monday 09:00, daily opt-in telemetry. `SYNC_SCHEDULER=off` disables it.
- **Product mapping.** Cost lines carry a provider sub-unit (OpenAI project, Vercel project, Anthropic workspace, Railway project, Cloudflare zone). `product_mappings` maps sub-units to products; `connections.product_id` catches lines with no sub-unit and all revenue from that connection. Unmapped lines fall into a "Shared" bucket.
- **Overview** (`src/server/overview.server.ts`): grouped monthly sums over 24 months; tiles compare the selected period with the equal period before, the chart's dotted line is the same months a year earlier. Period comes from the `?period=` search param.
- **Cloud mode** (`APP_MODE=cloud`): plans and limits in `src/lib/plans.ts`, Polar checkout/portal and webhook in `src/server/billing.server.ts` and `src/routes/api/polar/webhook.ts` (Standard Webhooks signature, `whsec_` secrets are base64). Inert in self-host.
- **Request middleware** in `src/start.ts` (`createMiddleware({ type: "request" })`): www to apex redirect, markdown responses for `Accept: text/markdown` (sources mapped in `src/server/markdown.server.ts`; add new public pages there), RFC 8288 `Link` headers, gzip of HTML/XML/JSON, and `Cache-Control: no-store` on /app, /onboarding and server function responses. Redirect responses must pass through unchanged: Start serializes server function redirects after the middleware. Start's CSRF check for server functions is added there explicitly, because a custom `createStart` drops the default. Request middleware runs under `pnpm dev` too.
- **Auth:** Better Auth with magic link plus GitHub/Google when their env vars are set (`src/lib/auth.ts`). Emails go through Resend when `RESEND_API_KEY` is set, otherwise they print to the server log.

## Content and SEO

- Docs: `src/docs/*.md` (order in `src/lib/docs.ts`). Marketing pages: `src/content/integrations/*.md`, `src/content/compare/*.md`, `src/content/changelog.md`, with `key: value` front matter, loaded by `src/lib/content.ts` (server-only) and served to route loaders by `src/server/content.functions.ts`, so markdown and `marked` stay out of the client bundle. Legal: `src/legal/*.md`.
- Public pages use `seo()` from `src/lib/app.ts` for title, description, canonical and social tags. App, login and onboarding use `NOINDEX`. `src/routes/sitemap[.]xml.ts` lists static pages plus public product pages from the db; add new public routes there.
- Comparison pages state competitor facts only from their official pages, cite them, and say "Not listed" rather than "not offered".

## Design rules

- Tokens in `src/styles.css`: paper/ink with neutrals mixed from them, light and dark (`.dark` class, toggled in `src/lib/theme.ts`). Change the system tokens, not individual components.
- One typeface: Geist. `--font-mono` points at Geist; numbers use the `num` utility (tabular figures). No serif or monospaced faces.
- Interaction rules live in `src/styles.css`, not components: press feedback on every button, visible keyboard focus, `display` utility for type 36px and up (tighter tracking), `menu-panel` for menus that open from their trigger, `chrome` for translucent sticky bars, `pressable` for links styled as buttons, `rise` for the one-time landing entrance, and `--ease-out` / `--ease-in-out` curves (UI motion stays under 300 ms; frequent actions like switching metric tiles don't animate beyond the chart), and reduced-motion, reduced-transparency and high-contrast overrides.
- Destructive actions (removing a connection or product) confirm first and say what happens to the data.
- No all-caps text anywhere. Headings weight 400. No shadows or gradients on the marketing pages, no emoji.
- The logo is the wordmark only (`src/components/logo.tsx`); don't add a mark next to it.
- Never name the sites the design was modeled on in code, comments, docs or commits.
- UI and marketing copy: short, specific, no filler or decorative text. Every sentence must be useful.

## Deploy

Push to `main` runs CI (`.github/workflows/check.yml`) and publishes `ghcr.io/lobbystack/openprofit:latest`. Railway deploys with `railway up --detach --ci` from the linked project (`openprofit`, service `web`, plus a Postgres service). Railway's edge caches `.xml` responses, so give those an explicit `Cache-Control`.
