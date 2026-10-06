import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	doublePrecision,
	index,
	integer,
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
	channel: text("channel", { enum: ["email"] })
		.notNull()
		.default("email"),
	enabled: boolean("enabled").notNull().default(true),
	createdAt: createdAt(),
});

export const alerts = pgTable("alerts", {
	id: id(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	ruleId: text("rule_id").references(() => alertRules.id, {
		onDelete: "set null",
	}),
	title: text("title").notNull(),
	detail: text("detail"),
	tone: text("tone", { enum: ["negative", "pending", "ink"] })
		.notNull()
		.default("ink"),
	openedAt: ms("opened_at").notNull(),
	resolvedAt: ms("resolved_at"),
});

// Pings received from self-hosted instances that opted in.
export const telemetryPings = pgTable("telemetry_pings", {
	id: id(),
	instance: text("instance").notNull(),
	version: text("version").notNull(),
	payload: text("payload").notNull(),
	seenAt: ms("seen_at").notNull(),
});
