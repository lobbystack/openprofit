import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	uniqueIndex,
} from "drizzle-orm/pg-core";

// Runs on Postgres. Self-host and local dev use PGlite (Postgres in a
// directory); the hosted version uses a Postgres server. See db/index.ts.
const ms = (name: string) => bigint(name, { mode: "number" });

// Money is stored as integer cents. `*_base` columns are in the workspace's
// base currency; the others in the source currency. Dates are YYYY-MM-DD.

const id = () =>
	text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
	ms("created_at")
		.notNull()
		.default(sql`(extract(epoch from now()) * 1000)::bigint`);

export const workspaces = pgTable("workspaces", {
	id: id(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	baseCurrency: text("base_currency").notNull().default("USD"),
	plan: text("plan", { enum: ["free", "indie", "pro"] })
		.notNull()
		.default("free"),
	weeklyEmail: boolean("weekly_email").notNull().default(true),
	// When the weekly email goes out: day (0 = Sunday) and hour in `timezone`,
	// an IANA name the browser reports when the schedule is saved.
	weeklyDay: integer("weekly_day").notNull().default(1),
	weeklyHour: integer("weekly_hour").notNull().default(9),
	timezone: text("timezone").notNull().default("UTC"),
	// Set when a weekly email is claimed, so one week never gets two.
	weeklySentAt: ms("weekly_sent_at"),
	// Self-host: send a daily anonymous usage ping. Off until switched on.
	telemetry: boolean("telemetry").notNull().default(false),
	// Hosted: include this workspace's numbers, anonymized, in the benchmark
	// cohorts. Opt-out.
	benchmarks: boolean("benchmarks").notNull().default(true),
	// The public read-only demo served at /demo. Left out of /open and the
	// benchmarks.
	demo: boolean("demo").notNull().default(false),
	createdAt: createdAt(),
});

export const workspaceMembers = pgTable(
	"workspace_members",
	{
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		userId: text("user_id").notNull(),
		role: text("role", { enum: ["owner", "member"] })
			.notNull()
			.default("owner"),
		createdAt: createdAt(),
	},
	(t) => [primaryKey({ columns: [t.workspaceId, t.userId] })],
);

export const products = pgTable(
	"products",
	{
		id: id(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		publicPage: text("public_page", {
			enum: ["off", "full", "revenue", "percent"],
		})
			.notNull()
			.default("off"),
		createdAt: createdAt(),
	},
	(t) => [uniqueIndex("products_ws_slug").on(t.workspaceId, t.slug)],
);

export const connections = pgTable(
	"connections",
	{
		id: id(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		provider: text("provider").notNull(),
		kind: text("kind", { enum: ["revenue", "cost"] }).notNull(),
		label: text("label"),
		authKind: text("auth_kind", { enum: ["oauth", "key"] }).notNull(),
		// AES-GCM ciphertext of a JSON credential object. See lib/crypto.ts.
		credentials: text("credentials").notNull(),
		status: text("status", { enum: ["active", "error", "paused"] })
			.notNull()
			.default("active"),
		// Product for lines with no sub-unit mapping. Null means shared.
		productId: text("product_id").references(() => products.id, {
			onDelete: "set null",
		}),
		cadenceMinutes: integer("cadence_minutes").notNull().default(360),
		lastSyncedAt: ms("last_synced_at"),
		lastError: text("last_error"),
		createdAt: createdAt(),
	},
	(t) => [index("connections_ws").on(t.workspaceId)],
);

// A provider sub-unit (OpenAI project, Vercel project, Railway project)
// assigned to a product. Unmapped lines follow the connection's product.
export const productMappings = pgTable(
	"product_mappings",
	{
		id: id(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		connectionId: text("connection_id")
			.notNull()
			.references(() => connections.id, { onDelete: "cascade" }),
		subUnitId: text("sub_unit_id").notNull(),
		subUnitLabel: text("sub_unit_label"),
		productId: text("product_id")
			.notNull()
			.references(() => products.id, { onDelete: "cascade" }),
	},
	(t) => [uniqueIndex("mappings_conn_unit").on(t.connectionId, t.subUnitId)],
);

export const revenueLines = pgTable(
	"revenue_lines",
	{
		id: id(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		connectionId: text("connection_id")
			.notNull()
			.references(() => connections.id, { onDelete: "cascade" }),
		productId: text("product_id").references(() => products.id, {
			onDelete: "set null",
		}),
		date: text("date").notNull(),
		currency: text("currency").notNull(),
		grossCents: integer("gross_cents").notNull(),
		feesCents: integer("fees_cents").notNull().default(0),
		refundsCents: integer("refunds_cents").notNull().default(0),
		netCents: integer("net_cents").notNull(),
		netBaseCents: integer("net_base_cents").notNull(),
		// Tax the customer paid, excluded from gross and net.
		taxCents: integer("tax_cents").notNull().default(0),
		taxBaseCents: integer("tax_base_cents").notNull().default(0),
		kind: text("kind", { enum: ["subscription", "one_time", "other"] })
			.notNull()
			.default("other"),
		subUnitId: text("sub_unit_id"),
		subUnitLabel: text("sub_unit_label"),
		externalId: text("external_id").notNull(),
		createdAt: createdAt(),
	},
	(t) => [
		uniqueIndex("revenue_conn_ext").on(t.connectionId, t.externalId),
		index("revenue_ws_date").on(t.workspaceId, t.date),
	],
);

export const costLines = pgTable(
	"cost_lines",
	{
		id: id(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		connectionId: text("connection_id").references(() => connections.id, {
			onDelete: "cascade",
		}),
		productId: text("product_id").references(() => products.id, {
			onDelete: "set null",
		}),
		provider: text("provider").notNull(),
		date: text("date").notNull(),
		currency: text("currency").notNull(),
		amountCents: integer("amount_cents").notNull(),
		amountBaseCents: integer("amount_base_cents").notNull(),
		service: text("service"),
		subUnitId: text("sub_unit_id"),
		subUnitLabel: text("sub_unit_label"),
		source: text("source", { enum: ["sync", "flat"] }).notNull(),
		externalId: text("external_id").notNull(),
		createdAt: createdAt(),
	},
	(t) => [
		uniqueIndex("cost_ws_ext").on(t.workspaceId, t.externalId),
		index("cost_ws_date").on(t.workspaceId, t.date),
	],
);

export const flatCosts = pgTable("flat_costs", {
	id: id(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	productId: text("product_id").references(() => products.id, {
		onDelete: "set null",
	}),
	name: text("name").notNull(),
	provider: text("provider").notNull().default("manual"),
	amountCents: integer("amount_cents").notNull(),
	currency: text("currency").notNull(),
	// The amount in the workspace's base currency, at the rate of the day it
	// was saved or the base currency last changed. Null on rows from before
	// the column; readers fall back to `amount_cents`.
	amountBaseCents: integer("amount_base_cents"),
	interval: text("interval", { enum: ["month", "year"] }).notNull(),
	startsOn: text("starts_on").notNull(),
	endsOn: text("ends_on"),
	createdAt: createdAt(),
});

// Point-in-time values a provider reports directly: MRR, active customers.
// Connectors report `mrr_base_cents` in the provider's currency; the sync
// converts it, so the stored value is in base cents.
export const metricSnapshots = pgTable(
	"metric_snapshots",
	{
		id: id(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		connectionId: text("connection_id")
			.notNull()
			.references(() => connections.id, { onDelete: "cascade" }),
		date: text("date").notNull(),
		metric: text("metric", { enum: ["mrr_base_cents", "customers"] }).notNull(),
		value: integer("value").notNull(),
	},
	(t) => [
		uniqueIndex("snap_conn_date_metric").on(t.connectionId, t.date, t.metric),
	],
);

export const fxRates = pgTable(
	"fx_rates",
	{
		date: text("date").notNull(),
		base: text("base").notNull(),
		currency: text("currency").notNull(),
		rate: doublePrecision("rate").notNull(),
	},
	(t) => [primaryKey({ columns: [t.date, t.base, t.currency] })],
);

export const syncRuns = pgTable("sync_runs", {
	id: id(),
	connectionId: text("connection_id")
		.notNull()
		.references(() => connections.id, { onDelete: "cascade" }),
	startedAt: ms("started_at").notNull(),
	finishedAt: ms("finished_at"),
	// auth_error: the provider rejected the key; no automatic retries.
	status: text("status", {
		enum: ["running", "ok", "error", "auth_error"],
	}).notNull(),
	linesWritten: integer("lines_written").notNull().default(0),
	error: text("error"),
});

export const alertRules = pgTable("alert_rules", {
	id: id(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	kind: text("kind", {
		enum: ["cost_spike", "margin_floor", "sync_failure"],
	}).notNull(),
	threshold: doublePrecision("threshold"),
	// Always email. Other channels are set per workspace in `alert_channels`
	// and receive every alert in addition to email.
	channel: text("channel", { enum: ["email"] })
		.notNull()
		.default("email"),
	enabled: boolean("enabled").notNull().default(true),
	createdAt: createdAt(),
});

export const alerts = pgTable(
	"alerts",
	{
		id: id(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		ruleId: text("rule_id").references(() => alertRules.id, {
			onDelete: "set null",
		}),
		// What the alert is about, such as `spike:openai`. One open alert per
		// key, so evaluating again never opens (or emails) a second one. Null on
		// alerts opened before the column existed.
		key: text("key"),
		title: text("title").notNull(),
		detail: text("detail"),
		tone: text("tone", { enum: ["negative", "pending", "ink"] })
			.notNull()
			.default("ink"),
		openedAt: ms("opened_at").notNull(),
		resolvedAt: ms("resolved_at"),
	},
	(t) => [
		uniqueIndex("alerts_ws_open_key")
			.on(t.workspaceId, t.key)
			.where(sql`${t.resolvedAt} is null`),
	],
);

// Where alerts go besides email. One row per workspace; a channel is on
// while it is configured (SMS once the number is verified).
export const alertChannels = pgTable("alert_channels", {
	workspaceId: text("workspace_id")
		.primaryKey()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	// Ciphertext (lib/crypto.ts) of the Slack incoming-webhook URL.
	slackWebhook: text("slack_webhook"),
	// Ciphertext of the endpoint URL and of its Standard Webhooks signing
	// secret (`whsec_...`).
	webhookUrl: text("webhook_url"),
	webhookSecret: text("webhook_secret"),
	// E.164 number. Receives SMS only once `sms_verified_at` is set.
	smsPhone: text("sms_phone"),
	// SHA-256 of the pending verification code, and when it stops working.
	smsCodeHash: text("sms_code_hash"),
	smsCodeExpiresAt: ms("sms_code_expires_at"),
	smsVerifiedAt: ms("sms_verified_at"),
	// SMS sent in `sms_month` (YYYY-MM), for the hosted monthly cap. A new
	// month resets the count.
	smsMonth: text("sms_month"),
	smsCount: integer("sms_count").notNull().default(0),
});

// Tokens for the MCP endpoint and the CLI. Only the SHA-256 of the token is
// stored; `prefix` is its first characters, shown in the UI to tell tokens
// apart.
export const apiTokens = pgTable(
	"api_tokens",
	{
		id: id(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		// The user who created it.
		userId: text("user_id").notNull(),
		name: text("name").notNull(),
		scope: text("scope", { enum: ["read", "write"] })
			.notNull()
			.default("read"),
		tokenHash: text("token_hash").notNull(),
		prefix: text("prefix").notNull(),
		lastUsedAt: ms("last_used_at"),
		revokedAt: ms("revoked_at"),
		// Tokens issued over OAuth (/oauth/token): the client's id, when the
		// access token expires, and the SHA-256 of the refresh token. A refresh
		// replaces both hashes on this row, so one connection stays one row.
		oauthClientId: text("oauth_client_id"),
		expiresAt: ms("expires_at"),
		refreshHash: text("refresh_hash"),
		createdAt: createdAt(),
	},
	(t) => [
		uniqueIndex("api_tokens_hash").on(t.tokenHash),
		uniqueIndex("api_tokens_refresh").on(t.refreshHash),
	],
);

// OAuth clients from Dynamic Client Registration (/oauth/register). Clients
// that use a Client ID Metadata Document aren't stored. Registration comes
// before anyone signs in, so there is no workspace; clients without a live
// token are deleted after a day.
export const oauthClients = pgTable("oauth_clients", {
	// The client_id.
	id: id(),
	name: text("name").notNull(),
	redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
	createdAt: createdAt(),
});

// OAuth authorization codes, valid 5 minutes and once. A second use revokes
// the token the first one got.
export const oauthCodes = pgTable(
	"oauth_codes",
	{
		id: id(),
		codeHash: text("code_hash").notNull(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		// The user who approved it.
		userId: text("user_id").notNull(),
		clientId: text("client_id").notNull(),
		clientName: text("client_name").notNull(),
		redirectUri: text("redirect_uri").notNull(),
		// PKCE S256 challenge.
		codeChallenge: text("code_challenge").notNull(),
		scope: text("scope", { enum: ["read", "write"] }).notNull(),
		expiresAt: ms("expires_at").notNull(),
		apiTokenId: text("api_token_id").references(() => apiTokens.id, {
			onDelete: "set null",
		}),
		usedAt: ms("used_at"),
		createdAt: createdAt(),
	},
	(t) => [uniqueIndex("oauth_codes_hash").on(t.codeHash)],
);

// One-time links (/connect/<token>, valid 15 minutes) where the user pastes
// a provider key in the browser instead of in an agent chat. Requested by a
// signed-in user or through an API token.
export const connectLinks = pgTable(
	"connect_links",
	{
		id: id(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		userId: text("user_id"),
		apiTokenId: text("api_token_id").references(() => apiTokens.id, {
			onDelete: "cascade",
		}),
		provider: text("provider").notNull(),
		// SHA-256 of the token in the link.
		tokenHash: text("token_hash").notNull(),
		expiresAt: ms("expires_at").notNull(),
		usedAt: ms("used_at"),
		// The connection the link created.
		connectionId: text("connection_id").references(() => connections.id, {
			onDelete: "set null",
		}),
		createdAt: createdAt(),
	},
	(t) => [uniqueIndex("connect_links_hash").on(t.tokenHash)],
);

// `npx openprofit login`: the CLI shows `user_code`, the user approves it in
// the browser, and the CLI polls with its device code until approved. The
// approval columns stay null until then.
export const cliLogins = pgTable(
	"cli_logins",
	{
		id: id(),
		// SHA-256 of the device code only the CLI holds.
		deviceCodeHash: text("device_code_hash").notNull(),
		userCode: text("user_code").notNull(),
		// The address `npx openprofit login` ran from, shown on the approval
		// page so a user can spot a request that isn't theirs.
		requestedIp: text("requested_ip"),
		expiresAt: ms("expires_at").notNull(),
		approvedAt: ms("approved_at"),
		// The user who approved it.
		userId: text("user_id"),
		workspaceId: text("workspace_id").references(() => workspaces.id, {
			onDelete: "cascade",
		}),
		// The token issued on approval.
		apiTokenId: text("api_token_id").references(() => apiTokens.id, {
			onDelete: "set null",
		}),
		createdAt: createdAt(),
	},
	(t) => [
		uniqueIndex("cli_logins_device").on(t.deviceCodeHash),
		uniqueIndex("cli_logins_user_code").on(t.userCode),
	],
);

// Changes made in the UI, over MCP or from the CLI. The weekly email lists
// the MCP ones, such as a public page switched on.
export const auditEvents = pgTable(
	"audit_events",
	{
		id: id(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		// A user id or an api_tokens id.
		actorKind: text("actor_kind", { enum: ["user", "token"] }).notNull(),
		actorId: text("actor_id").notNull(),
		source: text("source", { enum: ["ui", "mcp", "cli"] }).notNull(),
		// What happened, such as `product.public_page`, and to what (an id).
		action: text("action").notNull(),
		target: text("target"),
		detail: jsonb("detail").$type<Record<string, unknown>>(),
		createdAt: createdAt(),
	},
	(t) => [index("audit_ws_created").on(t.workspaceId, t.createdAt)],
);

// Monthly benchmark percentiles per MRR band. Aggregates across hosted
// workspaces, so it has no `workspace_id`. Money metrics
// are in USD cents, ratios in percent.
export const benchmarkSnapshots = pgTable(
	"benchmark_snapshots",
	{
		id: id(),
		month: text("month").notNull(), // YYYY-MM
		band: text("band", {
			enum: ["0-1k", "1k-5k", "5k-20k", "20k+"],
		}).notNull(),
		metric: text("metric").notNull(),
		// Workspaces in the cohort.
		n: integer("n").notNull(),
		p25: doublePrecision("p25").notNull(),
		p50: doublePrecision("p50").notNull(),
		p75: doublePrecision("p75").notNull(),
		p90: doublePrecision("p90").notNull(),
		computedAt: ms("computed_at").notNull(),
	},
	(t) => [
		uniqueIndex("benchmarks_month_band_metric").on(t.month, t.band, t.metric),
	],
);

// Pings received from self-hosted instances that opted in.
export const telemetryPings = pgTable("telemetry_pings", {
	id: id(),
	instance: text("instance").notNull(),
	version: text("version").notNull(),
	payload: text("payload").notNull(),
	seenAt: ms("seen_at").notNull(),
});
