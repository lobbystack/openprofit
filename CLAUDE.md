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

## Library docs before code

Don't write framework code from memory. TanStack ships versioned agent skills inside its packages, and a project hook (`.claude/settings.json`, `.intent/hooks/`) lists them at session start and blocks edits until the guidance is checked.

- TanStack Start and Router: load the matching skill first (`pnpm exec intent list`, then `pnpm exec intent load <package>#<skill>`). `package.json#intent.skills` lists the allowed skill sources; add a TanStack package there when the app starts using it.
- Anything the skills don't cover: read the docs for the installed version, e.g. `pnpm dlx @tanstack/cli search-docs "<query>" --library start --framework react` and `pnpm dlx @tanstack/cli doc <library> <path>`. When docs and the installed source disagree, the source in `node_modules` wins.
- Other libraries (Better Auth, Drizzle, PostHog, provider APIs): read their current docs before using an API, and cite the page in a short comment where the behaviour isn't obvious.

<!-- intent-skills:start -->
## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:
- Run `pnpm exec intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm exec intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Database

- Postgres everywhere through Drizzle (`src/db/schema.ts`, `src/db/auth-schema.ts`). `DATABASE_URL` starting with `postgres://` uses `pg`; anything else is a directory for **PGlite** (embedded Postgres, default `./data/openprofit`). Hosted uses Railway Postgres.
- Migrations in `./drizzle` run at import time of `src/db/index.ts` (skip with `SKIP_MIGRATIONS=1`). Don't use `drizzle-kit push`; PGlite rejects its multi-statement queries.
- **PGlite allows one process per data directory.** Running a script (`db:seed`, a tsx one-off) while `pnpm dev` is up hangs or fails. Killing a process mid-write (`kill -9`) can corrupt the directory. Stop dev cleanly first. One-off scripts must end with `process.exit(0)` or PGlite keeps them alive. SIGTERM and SIGINT close the database and exit (`src/db/index.ts`); without that, PGlite's timer keeps the process alive until Docker kills it.
- PGlite is excluded from Vite `optimizeDeps` and externalized from the Nitro server bundle in `vite.config.ts`; bundling it drops its wasm/data files and the server crashes on start. Keep both. `@resvg/resvg-wasm` (social images, `src/server/images.server.ts`) is externalized for the same reason.
- Money is integer cents. Each line stores the source amount and a `*_base_cents` amount in the workspace's base currency (Frankfurter/ECB daily rates, cached in `fx_rates`). Changing the base currency reconverts every line (`settings.functions.ts`).
- Every table carries `workspace_id`.

## Architecture

- **Server code split.** `*.functions.ts` export only `createServerFn` handlers (safe to import from components). `*.server.ts` hold server-only logic (db, secrets, node APIs) and must never be imported by client code. A plain exported helper in a `.functions.ts` file pulls the db into the client bundle and breaks the build; shared constants and schemas live in `src/lib/`. Server-only modules without the `.server` suffix (`src/db`, `src/lib/auth.ts`, `src/lib/crypto.ts`, connectors) start with `import "@tanstack/react-start/server-only"`. Components call mutations through `useServerFn` so a thrown redirect (expired session) navigates.
- **Workspace resolution.** `currentWorkspace()` (`src/server/workspace.server.ts`) picks the workspace from the `op_ws` cookie, falling back to the user's first membership, and redirects to /onboarding when there is none. All app server functions start with it.
- **Connectors** (`src/connectors/`): one file per provider implementing `verify`, and `fetchRevenue` / `fetchCosts` / `fetchSnapshots`, registered in `index.ts`. Credentials are AES-GCM encrypted with `SECRET_KEY` (`src/lib/crypto.ts`). Connector auth fields marked `optional` must not be `required` in the form.
- **Sync** (`src/server/sync.server.ts`): upserts lines by the provider's external id, so re-running a range is safe. First sync backfills 730 days (365 on the hosted free plan), later syncs reread the last 3 days. In-process croner scheduler (`scheduler.ts`): sync every 5 minutes for due connections, weekly email checked hourly against each workspace's day, hour and timezone, daily opt-in telemetry. `SYNC_SCHEDULER=off` disables it.
- **Product mapping.** Cost lines carry a provider sub-unit (OpenAI project, Vercel project, Anthropic workspace, Railway project, Cloudflare zone). `product_mappings` maps sub-units to products; `connections.product_id` catches lines with no sub-unit and all revenue from that connection. Unmapped lines fall into a "Shared" bucket.
- **Overview** (`src/server/overview.server.ts`): grouped monthly sums over 24 months; tiles compare the selected period with the equal period before, the chart's dotted line is the same months a year earlier. Period comes from the `?period=` search param.
- **Cloud mode** (`APP_MODE=cloud`): plans and limits in `src/lib/plans.ts`, Polar checkout/portal and webhook in `src/server/billing.server.ts` and `src/routes/api/polar/webhook.ts` (Standard Webhooks signature, `whsec_` secrets are base64). Inert in self-host.
- **Public demo** (`/demo`, `src/server/demo.server.ts`): the app's pages over one `demo = true` workspace with no members, rebuilt hourly by the seed generator (`src/server/seed.server.ts`, also behind `pnpm db:seed`). Read server functions take `{ demo: true }`; `currentWorkspace()` never returns the demo, so mutations can't reach it. On with `APP_MODE=cloud` or `DEMO=on`.
- **Edge middleware** in `src/server/edge.server.ts` (a Nitro plugin that puts itself ahead of Nitro's static files): www to apex redirect, markdown responses for `Accept: text/markdown` (sources mapped in `src/server/markdown.server.ts`; add new public pages there), RFC 8288 `Link` headers, and serving the prerendered pages. It must stay free of database imports, so pages with live data (`/open`, `/p/...`) answer markdown from their own route `GET` handler and call `next()` for HTML.
- **Request middleware** in `src/start.ts` (`createMiddleware({ type: "request" })`): tracing, gzip of server-rendered HTML/XML/JSON, and `Cache-Control: no-store` on /app, /onboarding and server function responses. Redirect responses must pass through unchanged: Start serializes server function redirects after the middleware. Start's CSRF check for server functions is added there explicitly, because a custom `createStart` drops the default. Request middleware runs under `pnpm dev` too.
- **Prerendering.** `pnpm build` prerenders the pages that have markdown (landing, docs, integrations, comparisons, changelog, legal) with TanStack Start's `prerender` option; the `PRERENDER` pattern in `vite.config.ts` must match `markdownFor`. Nitro builds its static file list before those files exist, so the edge middleware serves them (brotli or gzip, compressed once per process). Prerendered HTML can't hold per-request data: the root route has no loader, and analytics settings are fetched after hydration. Server routes import the database inside their handlers so the prerender never opens it.
- **Auth:** Better Auth with magic link plus GitHub/Google when their env vars are set (`src/lib/auth.ts`). Emails go through Resend when `RESEND_API_KEY` is set, otherwise they print to the server log.

## Content and SEO

- Docs: `src/docs/*.md` (order in `src/lib/docs.ts`). Marketing pages: `src/content/integrations/*.md`, `src/content/compare/*.md`, `src/content/changelog.md`, with `key: value` front matter, loaded by `src/lib/content.ts` (server-only) and served to route loaders by `src/server/content.functions.ts`, so markdown and `marked` stay out of the client bundle. Legal: `src/legal/*.md`.
- Public pages use `seo()` from `src/lib/app.ts` for title, description, canonical and social tags. App, login and onboarding use `NOINDEX`. `src/routes/sitemap[.]xml.ts` lists static pages plus public product pages from the db; add new public routes there.
- Comparison pages state competitor facts only from their official pages, cite them, and say "Not listed" rather than "not offered".

## Design rules

- Tokens in `src/styles.css`: paper/ink with neutrals mixed from them, light and dark (`.dark` class, toggled in `src/lib/theme.ts`). Change the system tokens, not individual components.
- One typeface: Geist. `--font-mono` points at Geist; numbers use the `num` utility (tabular figures). No serif or monospaced faces.
- Interaction rules live in `src/styles.css`, not components: press feedback on every button, visible keyboard focus, `display` utility for type 36px and up (tighter tracking), `chrome` for translucent sticky bars, `pressable` for links styled as buttons, `rise` for the one-time landing entrance, and `--ease-out` / `--ease-in-out` curves (UI motion stays under 300 ms; frequent actions like switching metric tiles don't animate beyond the chart), and reduced-motion, reduced-transparency and high-contrast overrides.
- UI components are shadcn on Base UI (`components.json`: style `base-nova`), with their source in `src/components/ui/`. Each file is tuned to the tokens (no shadows, the app's heights and type sizes), so pages use variants such as `<Button variant="outline" size="sm">` and never restyle a component at the call site; change the variant in the component file instead. Add components with `pnpm dlx shadcn@latest add <name>` and answer no when it offers to overwrite an existing file. Base UI specifics: buttons default to `type="button"`, so a submit button needs `type="submit"`; a link that looks like a button is the router `Link` (or the landing `Href`) with `className={buttonVariants(...)}`, not `Button` with `render`, which would give it `role="button"`. `biome.json` relaxes a few lint rules for `src/components/ui` only.
- Charts are shadcn `Chart` (Recharts) in `src/components/dashboard/area-chart-recharts.tsx`, loaded lazily through `area-chart.tsx` so pages don't wait for Recharts.
- Destructive actions (removing a connection, product or flat cost) confirm first in an `AlertDialog` (`useConfirm` in `src/components/app/confirm.tsx`) and say what happens to the data.
- No all-caps text anywhere. Headings weight 400. No shadows or gradients on the marketing pages, no emoji.
- The logo is the wordmark (`src/components/logo.tsx`). The mark sits before it only in the landing nav (`<Logo mark />`); everywhere else it's the wordmark alone.
- Provider logos are full-color SVG files in `public/logos/`, taken from SVGL (svgl.app), with a `-dark` variant when SVGL has one. No SVGL logo: use the brand's official press kit, then the Simple Icons path in its brand color. Never hand-draw a logo or show a text stand-in. Record the source in `public/logos/SOURCES.md`; the steps are in CONTRIBUTING.md.
- Never name the sites the design was modeled on in code, comments, docs or commits.
- UI and marketing copy: short, specific, no filler or decorative text. Every sentence must be useful.

## Deploy

Push to `main` runs CI (`.github/workflows/check.yml`) and publishes `ghcr.io/lobbystack/openprofit:latest`. Railway's `web` service (project `openprofit`, plus a Postgres service) deploys from the repo's `main` branch with Wait for CI on: each push waits for the GitHub checks, then deploys, and a failed check blocks it. Don't deploy production with `railway up`; it uploads the local working tree, uncommitted changes included. Railway's edge caches `.xml` responses, so give those an explicit `Cache-Control`.
