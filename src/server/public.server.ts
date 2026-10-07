import { and, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { db, schema } from "#/db";
import { money } from "#/lib/format";
import { PROVIDERS, providerName } from "#/lib/providers";
import { isCloud } from "./billing.server";
import { convert } from "./fx.server";
import { flatMonthlyCents } from "./overview.server";
import { productSeries } from "./product.server";

export type PublicMode = "full" | "revenue" | "percent";

// Public numbers cover the last 30 days, so pages, badges and /open stay
// comparable on any day of the month.
const DAY = 86_400_000;
function window30(now = Date.now()) {
	const ago = (n: number) => new Date(now - n * DAY).toISOString().slice(0, 10);
	return {
		from: ago(29),
		prevFrom: ago(59),
		thirtyAgo: ago(30),
		today: ago(0),
		month: ago(0).slice(0, 7),
		prevMonth: ago(30).slice(0, 7),
	};
}

type Stats = {
	// Base cents.
	revenue: number;
	prevRevenue: number;
	costs: number;
	firstRevenue: string | null;
	hasCosts: boolean;
};

// Revenue, costs and revenue growth over the last 30 days for some products.
// ponytail: flat costs count their whole monthly amount in each 30-day
// window; prorate by day if someone notices.
async function stats(ids: string[]): Promise<Map<string, Stats>> {
	const out = new Map<string, Stats>();
	if (!ids.length) return out;
	const w = window30();
	const r = schema.revenueLines;
	const c = schema.costLines;
	const [rev, cost, flats] = await Promise.all([
		db
			.select({
				id: r.productId,
				cur: sql<number>`coalesce(sum(case when ${r.date} >= ${w.from} then ${r.netBaseCents} end), 0)`,
				prev: sql<number>`coalesce(sum(case when ${r.date} >= ${w.prevFrom} and ${r.date} < ${w.from} then ${r.netBaseCents} end), 0)`,
				first: sql<string | null>`min(${r.date})`,
			})
			.from(r)
			.where(inArray(r.productId, ids))
			.groupBy(r.productId),
		db
			.select({
				id: c.productId,
				cur: sql<number>`coalesce(sum(case when ${c.date} >= ${w.from} then ${c.amountBaseCents} end), 0)`,
			})
			.from(c)
			.where(inArray(c.productId, ids))
			.groupBy(c.productId),
		db.query.flatCosts.findMany({
			where: inArray(schema.flatCosts.productId, ids),
		}),
	]);
	for (const id of ids)
		out.set(id, {
			revenue: 0,
			prevRevenue: 0,
			costs: 0,
			firstRevenue: null,
			hasCosts: false,
		});
	for (const x of rev) {
		const s = x.id && out.get(x.id);
		if (!s) continue;
		s.revenue = Number(x.cur);
		s.prevRevenue = Number(x.prev);
		s.firstRevenue = x.first;
	}
	for (const x of cost) {
		const s = x.id && out.get(x.id);
		if (!s) continue;
		s.costs += Number(x.cur);
		s.hasCosts = true;
	}
	for (const f of flats) {
		const s = f.productId && out.get(f.productId);
		if (!s) continue;
		s.costs += flatMonthlyCents(f, w.month);
		s.hasCosts = true;
	}
	return out;
}

const pct = (n: number) => Math.round(n * 10) / 10;
const margin = (s: Stats) =>
	s.revenue > 0 ? pct(((s.revenue - s.costs) / s.revenue) * 100) : null;
const growth = (s: Stats) =>
	s.prevRevenue > 0
		? pct(((s.revenue - s.prevRevenue) / s.prevRevenue) * 100)
		: null;

// The workspace and product behind a public page, or null when it's off.
export async function findPublic(wsSlug: string, productSlug: string) {
	const [row] = await db
		.select({ ws: schema.workspaces, product: schema.products })
		.from(schema.products)
		.innerJoin(
			schema.workspaces,
			eq(schema.workspaces.id, schema.products.workspaceId),
		)
		.where(
			and(
				eq(schema.workspaces.slug, wsSlug),
				eq(schema.products.slug, productSlug),
			),
		);
	if (!row || row.product.publicPage === "off") return null;
	return { ws: row.ws, product: row.product, mode: row.product.publicPage };
}

type Found = NonNullable<Awaited<ReturnType<typeof findPublic>>>;

// What a page, its badge and its image may show. Amounts are whole units
// in the workspace's currency and null where the mode hides them, so they
// never reach the browser.
export type PublicNumbers = {
	workspace: string;
	product: string;
	mode: PublicMode;
	currency: string;
	verified: boolean;
	revenue: number | null;
	costs: number | null;
	profit: number | null;
	margin: number | null;
	growth: number | null;
};

const units = (c: number) => Math.round(c) / 100;

export async function publicNumbers({
	ws,
	product,
	mode,
}: Found): Promise<PublicNumbers> {
	const s = (await stats([product.id])).get(product.id) as Stats;
	const full = mode === "full";
	return {
		workspace: ws.name,
		product: product.name,
		mode,
		currency: ws.baseCurrency,
		verified: isCloud,
		revenue: mode === "percent" ? null : units(s.revenue),
		costs: full ? units(s.costs) : null,
		profit: full ? units(s.revenue - s.costs) : null,
		margin: mode === "revenue" ? null : margin(s),
		growth: growth(s),
	};
}

export type CostSource = {
	name: string;
	// Provider id with a logo in public/logos, if any.
	logo: string | null;
	amount: number | null;
	selfReported: boolean;
};

export type PublicPage = PublicNumbers & {
	chart: { months: string[]; data: number[] } | null;
	// Provider ids the numbers were read from, for the verified line.
	providers: string[];
	sources: CostSource[];
	// Costs no product carries. Amount null where the mode hides amounts.
	shared: { amount: number | null } | null;
};

export async function publicPage(found: Found): Promise<PublicPage> {
	const { ws, product, mode } = found;
	const w = window30();
	const c = schema.costLines;
	const showCosts = mode !== "revenue";
	const amounts = mode === "full";
	const [numbers, series, revProviders, lines, flats, sharedLines] =
		await Promise.all([
			publicNumbers(found),
			mode === "percent"
				? null
				: productSeries(ws.id, ws.baseCurrency, product.id),
			db
				.selectDistinct({ provider: schema.connections.provider })
				.from(schema.revenueLines)
				.innerJoin(
					schema.connections,
					eq(schema.connections.id, schema.revenueLines.connectionId),
				)
				.where(
					and(
						eq(schema.revenueLines.productId, product.id),
						gte(schema.revenueLines.date, w.from),
					),
				),
			db
				.select({
					provider: c.provider,
					source: c.source,
					v: sql<number>`sum(${c.amountBaseCents})`,
				})
				.from(c)
				.where(and(eq(c.productId, product.id), gte(c.date, w.from)))
				.groupBy(c.provider, c.source),
			db.query.flatCosts.findMany({
				where: eq(schema.flatCosts.workspaceId, ws.id),
			}),
			db
				.select({ v: sql<number>`coalesce(sum(${c.amountBaseCents}), 0)` })
				.from(c)
				.where(
					and(
						eq(c.workspaceId, ws.id),
						isNull(c.productId),
						gte(c.date, w.from),
					),
				),
		]);
	const logo = (p: string) => (PROVIDERS[p] ? p : null);
	const sources: CostSource[] = [
		...lines.map((l) => ({
			name: providerName(l.provider),
			logo: logo(l.provider),
			cents: Number(l.v),
			selfReported: l.source !== "sync",
		})),
		...flats
			.filter((f) => f.productId === product.id)
			.map((f) => ({
				name: f.name,
				logo: logo(f.provider),
				cents: flatMonthlyCents(f, w.month),
				selfReported: true,
			})),
	]
		.filter((x) => x.cents > 0)
		// Without amounts, by name: the order would rank the costs.
		.sort((a, b) =>
			amounts ? b.cents - a.cents : a.name.localeCompare(b.name),
		)
		.map(({ cents, ...x }) => ({
			...x,
			amount: amounts ? units(cents) : null,
		}));
	const sharedCents =
		Number(sharedLines[0]?.v ?? 0) +
		flats
			.filter((f) => f.productId === null)
			.reduce((a, f) => a + flatMonthlyCents(f, w.month), 0);
	return {
		...numbers,
		chart: series
			? {
					months: series.months,
					data: mode === "full" ? series.profit : series.revenue,
				}
			: null,
		providers: [
			...new Set([
				...revProviders.map((p) => p.provider),
				...(showCosts
					? lines.filter((l) => l.source === "sync").map((l) => l.provider)
					: []),
			]),
		],
		sources: showCosts ? sources : [],
		shared:
			showCosts && sharedCents > 0
				? { amount: amounts ? units(sharedCents) : null }
				: null,
	};
}

// --- /open ---------------------------------------------------------------

// Amounts in US dollars, null where the product's page mode hides them.
export type OpenRow = {
	workspace: string;
	workspaceSlug: string;
	product: string;
	productSlug: string;
	revenue: number | null;
	profit: number | null;
	margin: number | null;
	growth: number | null;
};

let board: { at: number; rows: Promise<OpenRow[]> } | undefined;

// Public products on this instance with revenue, a cost source and 30 days
// of history, outside the demo workspace. Cached for five minutes.
export function openBoard(): Promise<OpenRow[]> {
	if (!board || Date.now() - board.at > 5 * 60_000) {
		board = { at: Date.now(), rows: loadBoard() };
		board.rows.catch(() => {
			board = undefined;
		});
	}
	return board.rows;
}

async function loadBoard(): Promise<OpenRow[]> {
	const w = window30();
	const products = await db
		.select({
			id: schema.products.id,
			name: schema.products.name,
			slug: schema.products.slug,
			mode: schema.products.publicPage,
			workspace: schema.workspaces.name,
			workspaceSlug: schema.workspaces.slug,
			currency: schema.workspaces.baseCurrency,
		})
		.from(schema.products)
		.innerJoin(
			schema.workspaces,
			eq(schema.workspaces.id, schema.products.workspaceId),
		)
		.where(
			and(
				ne(schema.products.publicPage, "off"),
				eq(schema.workspaces.demo, false),
			),
		);
	// ponytail: one pass over every public product's lines; precompute
	// nightly if /open gets slow.
	const all = await stats(products.map((p) => p.id));
	const rates = new Map<string, number | null>();
	for (const cur of new Set(products.map((p) => p.currency)))
		rates.set(
			cur,
			await convert(1_000_000, cur, "USD", w.today).then(
				(v) => v / 1_000_000,
				() => null,
			),
		);
	const usd = (cents: number, rate: number) => Math.round((cents * rate) / 100);
	const rows: OpenRow[] = [];
	for (const p of products) {
		const s = all.get(p.id);
		const rate = rates.get(p.currency);
		if (!s || !rate || !s.hasCosts) continue;
		if (!s.firstRevenue || s.firstRevenue > w.thirtyAgo) continue;
		rows.push({
			workspace: p.workspace,
			workspaceSlug: p.workspaceSlug,
			product: p.name,
			productSlug: p.slug,
			revenue: p.mode === "percent" ? null : usd(s.revenue, rate),
			profit: p.mode === "full" ? usd(s.revenue - s.costs, rate) : null,
			margin: p.mode === "revenue" ? null : margin(s),
			growth: growth(s),
		});
	}
	return rows;
}

// --- Markdown for agents ------------------------------------------------

const per = (n: number | null, sign = false) =>
	n === null ? "–" : `${sign && n > 0 ? "+" : ""}${Math.round(n)}%`;
const list = (items: string[]) =>
	new Intl.ListFormat("en", { type: "conjunction" }).format(items);

export function pageMarkdown(p: PublicPage) {
	const fmt = (n: number) => money(n, { currency: p.currency });
	const cells: [string, string][] = [];
	if (p.revenue !== null) cells.push(["Revenue", fmt(p.revenue)]);
	if (p.costs !== null) cells.push(["Costs", fmt(p.costs)]);
	if (p.profit !== null) cells.push(["Profit", fmt(p.profit)]);
	if (p.mode === "percent") cells.push(["Revenue growth", per(p.growth, true)]);
	if (p.mode !== "revenue") cells.push(["Margin", per(p.margin)]);
	const out = [
		`# ${p.product}`,
		"",
		`By ${p.workspace}. Last 30 days.`,
		"",
		`| ${cells.map((c) => c[0]).join(" | ")} |`,
		`| ${cells.map(() => "---").join(" | ")} |`,
		`| ${cells.map((c) => c[1]).join(" | ")} |`,
	];
	if (p.verified && p.providers.length)
		out.push(
			"",
			`Verified: OpenProfit reads these numbers from the ${list(p.providers.map(providerName))} APIs.`,
		);
	if (p.sources.length)
		out.push(
			"",
			"## Costs",
			"",
			...p.sources.map(
				(s) =>
					`- ${s.name}${s.amount !== null ? `: ${fmt(s.amount)}` : ""}${s.selfReported ? " (self-reported)" : ""}`,
			),
		);
	if (p.shared)
		out.push(
			"",
			p.shared.amount !== null
				? `Excludes ${fmt(p.shared.amount)} in shared costs.`
				: "Excludes shared costs.",
		);
	return out.join("\n");
}

export function openMarkdown(rows: OpenRow[]) {
	const usd = (n: number | null) => (n === null ? "–" : money(n));
	const ranked = rows
		.filter((r) => r.profit !== null)
		.sort((a, b) => (b.profit ?? 0) - (a.profit ?? 0));
	const rest = rows.filter((r) => r.profit === null);
	return [
		"# The database of open product profit",
		"",
		"Products that publish their numbers on OpenProfit, ranked by profit over the last 30 days. OpenProfit reads revenue and costs from the providers' APIs. Amounts in US dollars. A dash means the owner keeps that number private.",
		"",
		"| # | Product | By | Revenue | Profit | Margin | Growth |",
		"| --- | --- | --- | --- | --- | --- | --- |",
		...[...ranked, ...rest].map(
			(r, i) =>
				`| ${r.profit !== null ? i + 1 : "–"} | [${r.product}](https://openprofit.dev/p/${r.workspaceSlug}/${r.productSlug}) | ${r.workspace} | ${usd(r.revenue)} | ${usd(r.profit)} | ${per(r.margin)} | ${per(r.growth, true)} |`,
		),
	].join("\n");
}
