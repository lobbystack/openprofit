import {
	type CallToolResult,
	CLIENT_CAPABILITIES_META_KEY,
	type ClientCapabilities,
	createMcpHandler,
	type InputRequiredResult,
	inputRequired,
	inputResponse,
	type McpRequestContext,
	McpServer,
} from "@modelcontextprotocol/server";
import { and, desc, eq, gte, isNull, lte, type SQL } from "drizzle-orm";
import { z } from "zod";
import { connectorInfo, connectors } from "#/connectors";
import { db, schema } from "#/db";
import { RULE_NAMES, type RuleKind, ruleScope } from "#/lib/alerts";
import { JOURNAL_FORMATS } from "#/lib/books";
import {
	BooksSettingsInput,
	booksSettingsPatch,
	COST_CATEGORIES,
	REGIONS,
} from "#/lib/books-settings";
import { FlatCostInput, Day as IsoDay } from "#/lib/costs";
import { CURRENCIES } from "#/lib/format";
import pkg from "../../package.json";
import {
	appUrl,
	audit,
	authenticate,
	type Caller,
	providerError,
} from "./api.server";
import { journalCsv, Month } from "./books-export.server";
import { connectLinkStatus, createConnectLink } from "./connect.server";
import { connectionRows } from "./connections.server";
import { flatValues } from "./costs.server";
import { csvText } from "./export.server";
import {
	assignConnection,
	assignSubUnit,
	connectionDetail,
} from "./mappings.server";
import { challenge } from "./oauth.server";
import { overview } from "./overview.server";
import { productSeries } from "./product.server";
import { addProduct } from "./products.server";
import { syncConnection } from "./sync.server";

// The remote MCP server at /mcp. Streamable HTTP, stateless: a fresh server
// per request, serving 2026-07-28 clients and 2025-era clients alike.
// https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
// https://ts.sdk.modelcontextprotocol.io/v2/serving/http.md
// Read tokens get the read tools only.

const INSTRUCTIONS = `OpenProfit puts a workspace's revenue (Stripe, Polar, Paddle) next to its costs (OpenAI, Vercel, Anthropic and others) and shows profit per product. Amounts are in whole units (49.99, not cents), in the workspace currency unless a field says otherwise.

Never ask the user to paste an API key, secret or token into the chat. To connect a provider:
- If the local openprofit MCP server (npm package openprofit) is running, use its connect_provider. It reads the key from an env file by variable name, so the key stays out of the chat.
- Otherwise call connect_provider here and show the user the link it returns. They enter the key in the browser. Poll connection_status until it says connected.
Suggest a restricted, read-only key where the provider offers one; list_providers shows the permissions each key needs.
After you add a connection, call list_sub_units and propose a product for each sub-unit. Map them once the user agrees.
You can't undo removing a product, a connection or a flat cost, so confirm with the user first.`;

const READ = { readOnlyHint: true, openWorldHint: false };
const WRITE = {
	readOnlyHint: false,
	destructiveHint: false,
	openWorldHint: false,
};
const DESTRUCTIVE = {
	readOnlyHint: false,
	destructiveHint: true,
	openWorldHint: false,
};

const json = (data: unknown): CallToolResult => ({
	content: [{ type: "text", text: JSON.stringify(data) }],
});
const fail = (text: string): CallToolResult => ({
	content: [{ type: "text", text }],
	isError: true,
});

const units = (cents: number | null) =>
	cents === null ? null : Math.round(cents) / 100;
const iso = (ms: number | null) => (ms ? new Date(ms).toISOString() : null);

const Period = z
	.enum(["this-month", "30d", "last-month", "3m", "12m", "ytd"])
	.describe("Defaults to this-month");
const Day = IsoDay.describe("YYYY-MM-DD");
const Id = (what: string) => z.string().describe(`${what} id`);

type LineQuery = {
	kind: "revenue" | "cost";
	from?: string;
	to?: string;
	product_id?: string;
	connection_id?: string;
	limit: number;
	offset: number;
};

// Revenue or cost lines, newest first. product_id "unassigned" (or the
// old "shared") picks lines
// assigned to no product.
async function lines(ws: Caller["ws"], q: LineQuery) {
	const names = new Map(
		(
			await db.query.products.findMany({
				where: eq(schema.products.workspaceId, ws.id),
			})
		).map((p) => [p.id, p.name]),
	);
	if (q.kind === "revenue") {
		const t = schema.revenueLines;
		const where: SQL[] = [eq(t.workspaceId, ws.id)];
		if (q.from) where.push(gte(t.date, q.from));
		if (q.to) where.push(lte(t.date, q.to));
		if (q.connection_id) where.push(eq(t.connectionId, q.connection_id));
		if (q.product_id)
			where.push(
				q.product_id === "unassigned" || q.product_id === "shared"
					? isNull(t.productId)
					: eq(t.productId, q.product_id),
			);
		const rows = await db
			.select({ line: t, provider: schema.connections.provider })
			.from(t)
			.innerJoin(schema.connections, eq(schema.connections.id, t.connectionId))
			.where(and(...where))
			.orderBy(desc(t.date), t.id)
			.limit(q.limit)
			.offset(q.offset);
		return rows.map(({ line: l, provider }) => ({
			id: l.id,
			date: l.date,
			provider,
			product: l.productId ? (names.get(l.productId) ?? null) : null,
			product_id: l.productId,
			kind: l.kind,
			currency: l.currency,
			gross: units(l.grossCents),
			fees: units(l.feesCents),
			refunds: units(l.refundsCents),
			net: units(l.netCents),
			tax: units(l.taxCents),
			net_base: units(l.netBaseCents),
			sub_unit_id: l.subUnitId,
			sub_unit: l.subUnitLabel,
		}));
	}
	const t = schema.costLines;
	const where: SQL[] = [eq(t.workspaceId, ws.id)];
	if (q.from) where.push(gte(t.date, q.from));
	if (q.to) where.push(lte(t.date, q.to));
	if (q.connection_id) where.push(eq(t.connectionId, q.connection_id));
	if (q.product_id)
		where.push(
			q.product_id === "unassigned" || q.product_id === "shared"
				? isNull(t.productId)
				: eq(t.productId, q.product_id),
		);
	const rows = await db
		.select()
		.from(t)
		.where(and(...where))
		.orderBy(desc(t.date), t.id)
		.limit(q.limit)
		.offset(q.offset);
	return rows.map((l) => ({
		id: l.id,
		date: l.date,
		provider: l.provider,
		service: l.service,
		product: l.productId ? (names.get(l.productId) ?? null) : null,
		product_id: l.productId,
		currency: l.currency,
		amount: units(l.amountCents),
		amount_base: units(l.amountBaseCents),
		sub_unit_id: l.subUnitId,
		sub_unit: l.subUnitLabel,
	}));
}

const flatRow = (
	f: typeof schema.flatCosts.$inferSelect,
	names: Map<string, string>,
) => ({
	id: f.id,
	name: f.name,
	amount: units(f.amountCents),
	currency: f.currency,
	interval: f.interval,
	starts_on: f.startsOn,
	ends_on: f.endsOn,
	product_id: f.productId,
	product: f.productId ? (names.get(f.productId) ?? null) : null,
	category: f.category,
	paid_with: f.paidWith,
	paid_with_since: f.paidWithSince,
});

const booksSettings = (ws: Caller["ws"]) => ({
	incorporated_on: ws.incorporatedOn,
	country: ws.country,
	region: ws.region,
});

// Allowed thresholds per rule kind. margin_floor is a fraction, so an agent
// sending 60 for 60% gets told instead of storing 6000%.
const THRESHOLDS: Partial<
	Record<RuleKind, { min: number; max: number; message: string }>
> = {
	cost_spike: {
		min: 0.1,
		max: 20,
		message:
			"cost_spike thresholds run from 0.1 to 20: 1 alerts at twice the 7-day average.",
	},
	margin_floor: {
		min: 0,
		max: 1,
		message:
			"margin_floor is a fraction from 0 to 1: 0.6 alerts under 60% margin.",
	},
};

function build({ authInfo, requestInfo }: McpRequestContext) {
	const caller = authInfo?.extra?.caller as Caller;
	const request = requestInfo as Request;
	const { ws } = caller;
	const server = new McpServer(
		{ name: "openprofit", title: "OpenProfit", version: pkg.version },
		{ instructions: INSTRUCTIONS },
	);
	const log = (
		action: string,
		target: string | null,
		detail: Record<string, unknown>,
	) => audit(caller, "mcp", action, target, detail);
	const productNames = async () =>
		new Map(
			(
				await db.query.products.findMany({
					where: eq(schema.products.workspaceId, ws.id),
				})
			).map((p) => [p.id, p.name]),
		);
	const findProduct = (id: string) =>
		db.query.products.findFirst({
			where: and(
				eq(schema.products.id, id),
				eq(schema.products.workspaceId, ws.id),
			),
		});
	const noProduct = fail("No product with that id. list_products has them.");
	const noConnection = fail(
		"No connection with that id. list_connections has them.",
	);

	server.registerTool(
		"get_overview",
		{
			title: "Overview",
			description:
				"Revenue, costs, profit, MRR and subscriptions for a period, the same totals for the period before, monthly series for the 12 months to the period's end, and the period's breakdowns by product, cost provider and revenue source.",
			inputSchema: z.object({ period: Period.optional() }),
			annotations: READ,
		},
		async ({ period }) => {
			const o = await overview(ws, period);
			return json({
				workspace: ws.name,
				currency: o.currency,
				period: o.period,
				months: o.months,
				series: o.series,
				by_product: o.byProduct.map((p) => ({
					id: p.id,
					name: p.name,
					revenue: p.revenue,
					costs: p.costs,
					profit: Math.round((p.revenue - p.costs) * 100) / 100,
				})),
				costs_by_provider: o.costsByProvider,
				revenue_by_source: o.revenueBySource,
			});
		},
	);

	server.registerTool(
		"list_products",
		{
			title: "List products",
			description:
				'Products with revenue, costs, profit and margin for a period, and their public page mode and URL. "unassigned" holds lines assigned to no product.',
			inputSchema: z.object({ period: Period.optional() }),
			annotations: READ,
		},
		async ({ period }) => {
			const o = await overview(ws, period);
			const base = appUrl(request);
			return json(
				o.byProduct.map((p) => {
					const profit = Math.round((p.revenue - p.costs) * 100) / 100;
					const shared = p.id === "unassigned";
					return {
						id: p.id,
						name: p.name,
						revenue: p.revenue,
						costs: p.costs,
						profit,
						margin_pct: p.revenue
							? Math.round((profit / p.revenue) * 100)
							: null,
						public_page: shared ? null : p.publicPage,
						public_url:
							shared || p.publicPage === "off"
								? null
								: `${base}/p/${o.workspaceSlug}/${p.slug}`,
					};
				}),
			);
		},
	);

	server.registerTool(
		"get_product",
		{
			title: "Get product",
			description:
				"One product: revenue, costs and profit for each of the last 12 months, the connections and sub-units assigned to it, and its flat costs.",
			inputSchema: z.object({ product_id: Id("Product") }),
			annotations: READ,
		},
		async ({ product_id }) => {
			const p = await findProduct(product_id);
			if (!p) return noProduct;
			const [series, mapped, conns, flats] = await Promise.all([
				productSeries(ws.id, ws.baseCurrency, p.id),
				db
					.select({
						connection_id: schema.productMappings.connectionId,
						provider: schema.connections.provider,
						sub_unit_id: schema.productMappings.subUnitId,
						sub_unit: schema.productMappings.subUnitLabel,
					})
					.from(schema.productMappings)
					.innerJoin(
						schema.connections,
						eq(schema.connections.id, schema.productMappings.connectionId),
					)
					.where(eq(schema.productMappings.productId, p.id)),
				db.query.connections.findMany({
					where: and(
						eq(schema.connections.workspaceId, ws.id),
						eq(schema.connections.productId, p.id),
					),
					columns: { id: true, provider: true, label: true },
				}),
				db.query.flatCosts.findMany({
					where: and(
						eq(schema.flatCosts.workspaceId, ws.id),
						eq(schema.flatCosts.productId, p.id),
					),
				}),
			]);
			return json({
				id: p.id,
				name: p.name,
				public_page: p.publicPage,
				...series,
				connections: conns,
				sub_units: mapped,
				flat_costs: flats.map((f) => flatRow(f, new Map([[p.id, p.name]]))),
			});
		},
	);

	server.registerTool(
		"list_connections",
		{
			title: "List connections",
			description:
				"Revenue and cost connections with their status, last sync, last error, product (for lines without a sub-unit) and this month's amount (negative for costs).",
			annotations: READ,
		},
		async () =>
			json(
				(await connectionRows(ws)).map((c) => ({
					...c,
					lastSyncedAt: iso(c.lastSyncedAt),
					// The sentence, not the provider's raw response.
					lastError: c.lastError && providerError(c.provider, c.lastError, {}),
				})),
			),
	);

	server.registerTool(
		"list_sub_units",
		{
			title: "List sub-units",
			description:
				"The sub-units a connection reports (OpenAI or Vercel projects, Anthropic workspaces, Cloudflare zones, Stripe products), this month's amount for each, and the product each is mapped to. An unmapped sub-unit is unassigned.",
			inputSchema: z.object({ connection_id: Id("Connection") }),
			annotations: READ,
		},
		async ({ connection_id }) => {
			const detail = await connectionDetail(ws, connection_id);
			return detail ? json(detail) : noConnection;
		},
	);

	server.registerTool(
		"list_mappings",
		{
			title: "List mappings",
			description:
				"Every sub-unit mapped to a product, and each connection's product for lines without a sub-unit.",
			annotations: READ,
		},
		async () => {
			const [mapped, conns] = await Promise.all([
				db
					.select({
						connection_id: schema.productMappings.connectionId,
						provider: schema.connections.provider,
						sub_unit_id: schema.productMappings.subUnitId,
						sub_unit: schema.productMappings.subUnitLabel,
						product_id: schema.productMappings.productId,
						product: schema.products.name,
					})
					.from(schema.productMappings)
					.innerJoin(
						schema.connections,
						eq(schema.connections.id, schema.productMappings.connectionId),
					)
					.innerJoin(
						schema.products,
						eq(schema.products.id, schema.productMappings.productId),
					)
					.where(eq(schema.productMappings.workspaceId, ws.id)),
				connectionRows(ws),
			]);
			const names = await productNames();
			return json({
				sub_units: mapped,
				connection_defaults: conns.map((c) => ({
					connection_id: c.id,
					provider: c.provider,
					label: c.label,
					product_id: c.productId,
					product: c.productId ? (names.get(c.productId) ?? null) : null,
				})),
			});
		},
	);

	server.registerTool(
		"list_flat_costs",
		{
			title: "List flat costs",
			description:
				"Costs entered by hand (rent, a fixed subscription) with amount, currency, interval, dates and product.",
			annotations: READ,
		},
		async () => {
			const [flats, names] = await Promise.all([
				db.query.flatCosts.findMany({
					where: eq(schema.flatCosts.workspaceId, ws.id),
					orderBy: (f, { desc }) => desc(f.amountCents),
				}),
				productNames(),
			]);
			return json(flats.map((f) => flatRow(f, names)));
		},
	);

	server.registerTool(
		"get_books_settings",
		{
			title: "Get books settings",
			description:
				"What the books and the yearly tax report depend on: incorporated_on (the day the business became a company that files its own tax return; null if it isn't one), country (CA, US, or null for elsewhere) and region (a province or state code such as QC or CA).",
			annotations: READ,
		},
		async () => json(booksSettings(ws)),
	);

	const LineFilter = {
		kind: z.enum(["revenue", "cost"]),
		from: Day.optional(),
		to: Day.optional().describe("YYYY-MM-DD, inclusive"),
		product_id: z
			.string()
			.optional()
			.describe('A product id, or "unassigned" for lines with no product'),
		connection_id: z.string().optional(),
	};

	server.registerTool(
		"list_lines",
		{
			title: "List lines",
			description:
				"Synced revenue or cost lines, newest first, one page at a time. Amounts are in the line's currency; *_base fields are in the workspace currency.",
			inputSchema: z.object({
				...LineFilter,
				limit: z.number().int().min(1).max(500).default(100),
				offset: z.number().int().min(0).default(0),
			}),
			annotations: READ,
		},
		async (q) => {
			const rows = await lines(ws, q);
			return json({
				lines: rows,
				next_offset: rows.length === q.limit ? q.offset + q.limit : null,
			});
		},
	);

	server.registerTool(
		"export_csv",
		{
			title: "Export CSV",
			description:
				"Revenue lines, cost lines and flat costs in one CSV, the same file as Export CSV in the app. Revenue is positive and costs negative, so the Amount column sums to profit. Defaults to this calendar year.",
			inputSchema: z.object({
				from: Day.optional(),
				to: Day.optional().describe("YYYY-MM-DD, inclusive"),
			}),
			annotations: READ,
		},
		async (q) => {
			const year = new Date().getUTCFullYear();
			const text = await csvText(
				ws,
				q.from ?? `${year}-01-01`,
				q.to ?? `${year}-12-31`,
			);
			return { content: [{ type: "text", text }] };
		},
	);

	// Like downloading the file in the app, any token can export, and a
	// whole-workspace export closes the month: hence not read-only.
	server.registerTool(
		"export_journal",
		{
			title: "Export journal",
			description:
				"One month's journal entries as CSV: quickbooks (QuickBooks Online journal entry import), xero (Xero manual journal import) or plain (any accounting software). quickbooks and xero leave out payouts and costs paid from the company bank account, which the bank feed brings in. Exporting the whole workspace closes the month: exporting it again returns the same file, and later changes to it come as adjustments in the next month's export. A one-product export leaves out shared and unassigned costs and closes nothing.",
			inputSchema: z.object({
				month: Month.describe("YYYY-MM, a month that has ended"),
				format: z.enum(JOURNAL_FORMATS),
				product_id: Id("Product")
					.optional()
					.describe("Product id; leave out for the whole workspace"),
			}),
			annotations: { ...WRITE, idempotentHint: true },
		},
		async (q) => {
			const out = await journalCsv(ws, q.month, q.format, q.product_id ?? null);
			return "error" in out
				? fail(out.error)
				: { content: [{ type: "text", text: out.csv }] };
		},
	);

	server.registerTool(
		"list_alerts",
		{
			title: "List alerts",
			description:
				"The 50 latest alerts (open ones have no resolvedAt) and the rules with what each watches. Rules run after every sync.",
			annotations: READ,
		},
		async () => {
			const [alerts, rules] = await Promise.all([
				db.query.alerts.findMany({
					where: eq(schema.alerts.workspaceId, ws.id),
					orderBy: [desc(schema.alerts.openedAt)],
					limit: 50,
				}),
				db.query.alertRules.findMany({
					where: eq(schema.alertRules.workspaceId, ws.id),
					orderBy: (r, { asc }) => asc(r.createdAt),
				}),
			]);
			return json({
				alerts: alerts.map((a) => ({
					id: a.id,
					title: a.title,
					detail: a.detail,
					openedAt: iso(a.openedAt),
					resolvedAt: iso(a.resolvedAt),
				})),
				rules: rules.map((r) => ({
					id: r.id,
					kind: r.kind,
					name: RULE_NAMES[r.kind],
					watches: ruleScope(r.kind, r.threshold),
					threshold: r.threshold,
					enabled: r.enabled,
				})),
			});
		},
	);

	server.registerTool(
		"list_providers",
		{
			title: "List providers",
			description:
				"Providers OpenProfit can connect, with the key fields each needs, where to create the key and the permissions to give it.",
			annotations: READ,
		},
		async () => json(connectors().map(connectorInfo)),
	);

	server.registerTool(
		"connection_status",
		{
			title: "Connection status",
			description:
				"Whether the user finished a connect_provider link: pending, connected (with the new connection) or expired.",
			inputSchema: z.object({ link_id: z.string() }),
			annotations: READ,
		},
		async ({ link_id }) => {
			const status = await connectLinkStatus(ws, link_id);
			return status ? json(status) : fail("No link with that id.");
		},
	);

	if (caller.token.scope !== "write") return server;

	server.registerTool(
		"create_product",
		{
			title: "Create product",
			description: "Adds a product. Its public page starts off.",
			inputSchema: z.object({ name: z.string().trim().min(1).max(60) }),
			annotations: WRITE,
		},
		async ({ name }) => {
			const p = await addProduct(ws, name);
			await log("product.create", p.id, { name });
			return json({ id: p.id, name: p.name });
		},
	);

	server.registerTool(
		"rename_product",
		{
			title: "Rename product",
			description: "Renames a product. Its public page keeps its URL.",
			inputSchema: z.object({
				product_id: Id("Product"),
				name: z.string().trim().min(1).max(60),
			}),
			annotations: { ...WRITE, idempotentHint: true },
		},
		async ({ product_id, name }) => {
			const before = await findProduct(product_id);
			if (!before) return noProduct;
			await db
				.update(schema.products)
				.set({ name })
				.where(eq(schema.products.id, before.id));
			await log("product.rename", before.id, { name, from: before.name });
			return json({ id: before.id, name });
		},
	);

	server.registerTool(
		"delete_product",
		{
			title: "Delete product",
			description:
				"Deletes a product and its sub-unit mappings, and takes its public page offline. Its revenue, costs and flat costs move to Unassigned; synced lines stay. Can't be undone.",
			inputSchema: z.object({ product_id: Id("Product") }),
			annotations: DESTRUCTIVE,
		},
		async ({ product_id }) => {
			const [removed] = await db
				.delete(schema.products)
				.where(
					and(
						eq(schema.products.id, product_id),
						eq(schema.products.workspaceId, ws.id),
					),
				)
				.returning({ name: schema.products.name });
			if (!removed) return noProduct;
			await log("product.delete", product_id, { name: removed.name });
			return json({ deleted: removed.name });
		},
	);

	server.registerTool(
		"set_public_page",
		{
			title: "Set public page",
			description:
				"Turns a product's public page on or off. full shows revenue, costs and profit; revenue shows revenue only; percent shows margin and growth without amounts. Anyone with the URL can see it, so check with the user first.",
			inputSchema: z.object({
				product_id: Id("Product"),
				mode: z.enum(["off", "full", "revenue", "percent"]),
			}),
			annotations: { ...WRITE, idempotentHint: true, openWorldHint: true },
		},
		async ({ product_id, mode }) => {
			const p = await findProduct(product_id);
			if (!p) return noProduct;
			await db
				.update(schema.products)
				.set({ publicPage: mode })
				.where(eq(schema.products.id, p.id));
			await log("product.public_page", p.id, { name: p.name, mode });
			return json({
				id: p.id,
				public_page: mode,
				public_url:
					mode === "off" ? null : `${appUrl(request)}/p/${ws.slug}/${p.slug}`,
			});
		},
	);

	server.registerTool(
		"sync_connection",
		{
			title: "Sync connection",
			description:
				"Starts a full sync of one connection in the background. list_connections shows when it finished.",
			inputSchema: z.object({ connection_id: Id("Connection") }),
			annotations: { ...WRITE, idempotentHint: true, openWorldHint: true },
		},
		async ({ connection_id }) => {
			const conn = await db.query.connections.findFirst({
				where: and(
					eq(schema.connections.id, connection_id),
					eq(schema.connections.workspaceId, ws.id),
				),
			});
			if (!conn) return noConnection;
			void syncConnection(conn, { full: true }).catch((err) =>
				console.error(`[sync] ${conn.provider}:`, err),
			);
			return json({ status: "started" });
		},
	);

	server.registerTool(
		"remove_connection",
		{
			title: "Remove connection",
			description:
				"Removes a connection and deletes every revenue or cost line synced from it, its sub-unit mappings and its stored key. Reconnecting syncs the history again. Can't be undone.",
			inputSchema: z.object({ connection_id: Id("Connection") }),
			annotations: DESTRUCTIVE,
		},
		async ({ connection_id }) => {
			const [removed] = await db
				.delete(schema.connections)
				.where(
					and(
						eq(schema.connections.id, connection_id),
						eq(schema.connections.workspaceId, ws.id),
					),
				)
				.returning({
					provider: schema.connections.provider,
					label: schema.connections.label,
				});
			if (!removed) return noConnection;
			await log("connection.delete", connection_id, {
				name: removed.label ?? removed.provider,
				provider: removed.provider,
			});
			return json({ removed });
		},
	);

	server.registerTool(
		"set_connection_product",
		{
			title: "Set connection product",
			description:
				"Sets the product for a connection's lines that belong to no sub-unit (every line, for providers without sub-units), past lines included. null leaves them unassigned. Assign sub-units with map_sub_unit.",
			inputSchema: z.object({
				connection_id: Id("Connection"),
				product_id: z.string().nullable(),
			}),
			annotations: { ...WRITE, idempotentHint: true },
		},
		async ({ connection_id, product_id }) => {
			const conn = await assignConnection(ws, {
				connectionId: connection_id,
				productId: product_id,
			});
			if (!conn) return noConnection;
			await log("connection.product", conn.id, {
				name: conn.label ?? conn.provider,
				product_id,
			});
			return json({ ok: true });
		},
	);

	server.registerTool(
		"map_sub_unit",
		{
			title: "Map sub-unit",
			description:
				"Assigns a sub-unit (from list_sub_units) to a product. Its lines, past ones included, count toward that product.",
			inputSchema: z.object({
				connection_id: Id("Connection"),
				sub_unit_id: z.string(),
				product_id: Id("Product"),
			}),
			annotations: { ...WRITE, idempotentHint: true },
		},
		async ({ connection_id, sub_unit_id, product_id }) => {
			const conn = await assignSubUnit(ws, {
				connectionId: connection_id,
				subUnitId: sub_unit_id,
				productId: product_id,
			});
			if (!conn) return noConnection;
			await log("mapping.set", conn.id, { name: sub_unit_id, product_id });
			return json({ ok: true });
		},
	);

	server.registerTool(
		"unmap_sub_unit",
		{
			title: "Unmap sub-unit",
			description: "Removes a sub-unit's product. Its lines become unassigned.",
			inputSchema: z.object({
				connection_id: Id("Connection"),
				sub_unit_id: z.string(),
			}),
			annotations: { ...WRITE, idempotentHint: true },
		},
		async ({ connection_id, sub_unit_id }) => {
			const conn = await assignSubUnit(ws, {
				connectionId: connection_id,
				subUnitId: sub_unit_id,
				productId: null,
			});
			if (!conn) return noConnection;
			await log("mapping.delete", conn.id, { name: sub_unit_id });
			return json({ ok: true });
		},
	);

	const FlatFields = {
		name: z.string().trim().min(1).max(80),
		amount: z.number().positive().describe("In whole units, such as 49.99"),
		currency: z.enum(CURRENCIES),
		interval: z
			.enum(["month", "year", "once"])
			.describe("once: a one-time cost dated starts_on, with no ends_on"),
		starts_on: Day,
		ends_on: Day.nullable().optional().describe("YYYY-MM-DD, or null"),
		product_id: z
			.string()
			.nullable()
			.optional()
			.describe("null or absent: Unassigned"),
		category: z
			.enum(COST_CATEGORIES)
			.nullable()
			.optional()
			.describe(
				"The books account. equipment (a computer) is an asset. null: other",
			),
		paid_with: z
			.enum(["personal", "company"])
			.optional()
			.describe(
				"Who pays, for incorporated workspaces: a personal card or the company account. Defaults to personal",
			),
		paid_with_since: Day.nullable()
			.optional()
			.describe("The day paid_with changed; before it, the other one paid"),
	};
	const saveFlat = async (f: {
		name: string;
		amount: number;
		currency: (typeof CURRENCIES)[number];
		interval: "month" | "year" | "once";
		starts_on: string;
		ends_on?: string | null;
		product_id?: string | null;
		category?: (typeof COST_CATEGORIES)[number] | null;
		paid_with?: "personal" | "company";
		paid_with_since?: string | null;
	}) => {
		const input = FlatCostInput.safeParse({
			name: f.name,
			amountCents: Math.round(f.amount * 100),
			currency: f.currency,
			interval: f.interval,
			startsOn: f.starts_on,
			endsOn: f.ends_on ?? null,
			productId: f.product_id ?? null,
			category: f.category,
			paidWith: f.paid_with,
			paidWithSince: f.paid_with_since,
		});
		if (!input.success) throw new Error(input.error.issues[0].message);
		return flatValues(ws, input.data);
	};

	server.registerTool(
		"add_flat_cost",
		{
			title: "Add flat cost",
			description:
				"Adds a cost entered by hand. It counts in every month from starts_on to ends_on; a yearly cost spreads over 12 months.",
			inputSchema: z.object(FlatFields),
			annotations: WRITE,
		},
		async (f) => {
			const values = await saveFlat(f);
			const [row] = await db
				.insert(schema.flatCosts)
				.values({ workspaceId: ws.id, ...values })
				.returning();
			await log("flat_cost.create", row.id, { name: row.name });
			return json(flatRow(row, await productNames()));
		},
	);

	server.registerTool(
		"update_flat_cost",
		{
			title: "Update flat cost",
			description:
				"Changes a flat cost. Fields left out keep their value. Past months follow the change; to change the amount from now on, set ends_on and add a new cost.",
			inputSchema: z.object({
				flat_cost_id: Id("Flat cost"),
				...z.object(FlatFields).partial().shape,
			}),
			annotations: { ...WRITE, idempotentHint: true },
		},
		async ({ flat_cost_id, ...patch }) => {
			const f = await db.query.flatCosts.findFirst({
				where: and(
					eq(schema.flatCosts.id, flat_cost_id),
					eq(schema.flatCosts.workspaceId, ws.id),
				),
			});
			if (!f) return fail("No flat cost with that id.");
			const values = await saveFlat({
				name: f.name,
				amount: f.amountCents / 100,
				currency: f.currency as (typeof CURRENCIES)[number],
				interval: f.interval,
				starts_on: f.startsOn,
				ends_on: f.endsOn,
				product_id: f.productId,
				...Object.fromEntries(
					Object.entries(patch).filter(([, v]) => v !== undefined),
				),
			});
			const [row] = await db
				.update(schema.flatCosts)
				.set(values)
				.where(eq(schema.flatCosts.id, f.id))
				.returning();
			await log("flat_cost.update", f.id, { name: row.name });
			return json(flatRow(row, await productNames()));
		},
	);

	server.registerTool(
		"delete_flat_cost",
		{
			title: "Delete flat cost",
			description:
				"Deletes a flat cost. It stops counting in costs and profit for every month, past months included. To keep past months, set ends_on with update_flat_cost instead. Can't be undone.",
			inputSchema: z.object({ flat_cost_id: Id("Flat cost") }),
			annotations: DESTRUCTIVE,
		},
		async ({ flat_cost_id }) => {
			const [removed] = await db
				.delete(schema.flatCosts)
				.where(
					and(
						eq(schema.flatCosts.id, flat_cost_id),
						eq(schema.flatCosts.workspaceId, ws.id),
					),
				)
				.returning({ name: schema.flatCosts.name });
			if (!removed) return fail("No flat cost with that id.");
			await log("flat_cost.delete", flat_cost_id, { name: removed.name });
			return json({ deleted: removed.name });
		},
	);

	server.registerTool(
		"update_books_settings",
		{
			title: "Update books settings",
			description:
				"Changes the books settings. Fields left out keep their value. Passing country also sets region, to null when region is absent, so send both together.",
			inputSchema: z.object({
				incorporated_on: Day.nullable()
					.optional()
					.describe(
						"The day the business became a company that files its own tax return; null if it isn't one",
					),
				country: z
					.enum(["CA", "US"])
					.nullable()
					.optional()
					.describe(
						"null: elsewhere, and the report is a plain profit and loss",
					),
				region: z
					.string()
					.nullable()
					.optional()
					.describe(
						`Province or state code. Canada: ${Object.keys(REGIONS.CA).join(", ")}. US: two-letter state codes`,
					),
			}),
			annotations: { ...WRITE, idempotentHint: true },
		},
		async (q) => {
			if (Object.values(q).every((v) => v === undefined))
				return fail("Pass incorporated_on, country or region.");
			const input = BooksSettingsInput.safeParse({
				incorporatedOn: q.incorporated_on,
				country: q.country,
				region: q.region,
			});
			if (!input.success) return fail(input.error.issues[0].message);
			const [row] = await db
				.update(schema.workspaces)
				.set(booksSettingsPatch(input.data))
				.where(eq(schema.workspaces.id, ws.id))
				.returning();
			await log("books_settings.update", ws.id, {
				name: ws.name,
				...booksSettings(row),
			});
			return json(booksSettings(row));
		},
	);

	server.registerTool(
		"update_alert_rule",
		{
			title: "Update alert rule",
			description:
				"Turns an alert rule on or off, or changes its threshold. cost_spike: a day's spend above (1 + threshold) times the 7-day average. margin_floor: a product under this margin (0.6 = 60%) over 7 days.",
			inputSchema: z.object({
				rule_id: Id("Rule"),
				enabled: z.boolean().optional(),
				threshold: z.number().optional(),
			}),
			annotations: { ...WRITE, idempotentHint: true },
		},
		async ({ rule_id, enabled, threshold }) => {
			if (enabled === undefined && threshold === undefined)
				return fail("Pass enabled, threshold or both.");
			const where = and(
				eq(schema.alertRules.id, rule_id),
				eq(schema.alertRules.workspaceId, ws.id),
			);
			const before = await db.query.alertRules.findFirst({ where });
			if (!before) return fail("No rule with that id. list_alerts has them.");
			if (threshold !== undefined) {
				const range = THRESHOLDS[before.kind];
				if (!range) return fail("Sync failure rules have no threshold.");
				if (threshold < range.min || threshold > range.max)
					return fail(range.message);
			}
			const [rule] = await db
				.update(schema.alertRules)
				.set({ enabled, threshold })
				.where(where)
				.returning();
			await log("alert_rule.update", rule.id, {
				name: RULE_NAMES[rule.kind],
				enabled: rule.enabled,
				threshold: rule.threshold,
			});
			return json({
				id: rule.id,
				enabled: rule.enabled,
				watches: ruleScope(rule.kind, rule.threshold),
			});
		},
	);

	server.registerTool(
		"connect_provider",
		{
			title: "Connect provider",
			description:
				"Makes a one-time link (valid 15 minutes) where the user enters the provider's key in the browser, so the key never enters the chat. Returns the url to show the user and a link_id for connection_status.",
			inputSchema: z.object({
				provider: z.string().describe("A provider id from list_providers"),
				product_id: z
					.string()
					.optional()
					.describe(
						"Product for the connection. Its first sync assigns every line to it",
					),
			}),
			annotations: { ...WRITE, openWorldHint: true },
		},
		async (
			{ provider, product_id },
			ctx,
		): Promise<CallToolResult | InputRequiredResult> => {
			// A retry after the URL elicitation below carries the link back.
			// https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation#url-mode-elicitation-requests
			const state = ctx.mcpReq.requestState<string>();
			if (state) {
				const link = JSON.parse(state) as { link_id: string; url: string };
				const status = await connectLinkStatus(ws, link.link_id);
				if (!status) return fail("No link with that id.");
				const answer = inputResponse(ctx.mcpReq.inputResponses, "connect");
				return json({
					...link,
					...status,
					opened: answer.kind === "elicit" && answer.action === "accept",
				});
			}
			const link = await createConnectLink(
				caller,
				request,
				provider,
				product_id,
			);
			const caps = (
				ctx.mcpReq.envelope as
					| Record<string, ClientCapabilities | undefined>
					| undefined
			)?.[CLIENT_CAPABILITIES_META_KEY];
			if (caps?.elicitation?.url)
				return inputRequired({
					inputRequests: {
						connect: inputRequired.elicitUrl({
							message: `Enter your ${link.provider} key on OpenProfit. It won't pass through this chat.`,
							url: link.url,
						}),
					},
					requestState: JSON.stringify({
						link_id: link.link_id,
						url: link.url,
					}),
				});
			return json(link);
		},
	);

	return server;
}

const handler = createMcpHandler(build, {
	onerror: (err) => console.error("[mcp]", err),
});

export async function serveMcp(request: Request) {
	const caller = await authenticate(request);
	if (!caller) return challenge(request);
	return handler.fetch(request, {
		authInfo: {
			token: caller.token.id,
			clientId: caller.token.id,
			scopes: [caller.token.scope],
			extra: { caller },
		},
	});
}
