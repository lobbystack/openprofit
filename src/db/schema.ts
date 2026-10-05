import { sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Money is stored as integer cents. `*_base` columns are in the workspace's
// base currency; the others in the source currency. Dates are YYYY-MM-DD.

const id = () =>
	text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
	integer("created_at").notNull().default(sql`(unixepoch() * 1000)`);

export const workspaces = sqliteTable("workspaces", {
	id: id(),
	name: text("name").notNull(),
	slug: text("slug").notNull().unique(),
	baseCurrency: text("base_currency").notNull().default("USD"),
	plan: text("plan", { enum: ["free", "indie", "pro"] })
		.notNull()
		.default("free"),
	weeklyEmail: integer("weekly_email", { mode: "boolean" })
		.notNull()
		.default(true),
	createdAt: createdAt(),
});

export const workspaceMembers = sqliteTable(
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

export const products = sqliteTable(
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

export const connections = sqliteTable(
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
		cadenceMinutes: integer("cadence_minutes").notNull().default(360),
		lastSyncedAt: integer("last_synced_at"),
		lastError: text("last_error"),
		createdAt: createdAt(),
	},
	(t) => [index("connections_ws").on(t.workspaceId)],
);

// A provider sub-unit (OpenAI project, Vercel project, Railway service)
// assigned to a product. Unmapped lines stay in the shared bucket.
export const productMappings = sqliteTable(
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

export const revenueLines = sqliteTable(
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
		kind: text("kind", { enum: ["subscription", "one_time", "other"] })
			.notNull()
			.default("other"),
		externalId: text("external_id").notNull(),
		createdAt: createdAt(),
	},
	(t) => [
		uniqueIndex("revenue_conn_ext").on(t.connectionId, t.externalId),
		index("revenue_ws_date").on(t.workspaceId, t.date),
	],
);

export const costLines = sqliteTable(
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
		source: text("source", { enum: ["sync", "flat"] }).notNull(),
		externalId: text("external_id").notNull(),
		createdAt: createdAt(),
	},
	(t) => [
		uniqueIndex("cost_ws_ext").on(t.workspaceId, t.externalId),
		index("cost_ws_date").on(t.workspaceId, t.date),
	],
);

export const flatCosts = sqliteTable("flat_costs", {
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
export const metricSnapshots = sqliteTable(
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

export const fxRates = sqliteTable(
	"fx_rates",
	{
		date: text("date").notNull(),
		base: text("base").notNull(),
		currency: text("currency").notNull(),
		rate: real("rate").notNull(),
	},
	(t) => [primaryKey({ columns: [t.date, t.base, t.currency] })],
);

export const syncRuns = sqliteTable("sync_runs", {
	id: id(),
	connectionId: text("connection_id")
		.notNull()
		.references(() => connections.id, { onDelete: "cascade" }),
	startedAt: integer("started_at").notNull(),
	finishedAt: integer("finished_at"),
	status: text("status", { enum: ["running", "ok", "error"] }).notNull(),
	linesWritten: integer("lines_written").notNull().default(0),
	error: text("error"),
});

export const alertRules = sqliteTable("alert_rules", {
	id: id(),
	workspaceId: text("workspace_id")
		.notNull()
		.references(() => workspaces.id, { onDelete: "cascade" }),
	kind: text("kind", {
		enum: ["cost_spike", "margin_floor", "sync_failure"],
	}).notNull(),
	threshold: real("threshold"),
	channel: text("channel", { enum: ["email"] })
		.notNull()
		.default("email"),
	enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
	createdAt: createdAt(),
});

export const alerts = sqliteTable("alerts", {
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
	openedAt: integer("opened_at").notNull(),
	resolvedAt: integer("resolved_at"),
});
