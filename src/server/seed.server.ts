import "@tanstack/react-start/server-only";
import { connector } from "#/connectors";
import { splitCents } from "#/connectors/types";
import { type db, schema } from "#/db";
import { encrypt } from "#/lib/crypto";

// Sample numbers for `pnpm db:seed` and the public demo: two years ending
// this month, so charts have a year-earlier line, three products, Stripe for
// revenue, seven cost providers and a few flat costs.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const REVENUE = [
	2380, 2610, 2850, 3090, 3360, 3640, 3930, 4250, 4590, 4940, 5310, 5700, 6120,
	6480, 7010, 7390, 7820, 8350, 8910, 9420, 10080, 10760, 11540, 12480,
];
const COSTS = [
	690, 740, 790, 850, 910, 980, 1050, 1120, 1200, 1280, 1360, 1430, 1480, 1520,
	1610, 1740, 1890, 2050, 2210, 2380, 2590, 2770, 2960, 3112,
];
const MRR = [
	2300, 2520, 2760, 3010, 3270, 3550, 3850, 4170, 4510, 4870, 5250, 5620, 5900,
	6200, 6700, 7050, 7500, 8000, 8550, 9050, 9700, 10350, 11100, 11900,
];
const CUSTOMERS = [
	88, 96, 105, 114, 123, 133, 143, 154, 165, 177, 189, 201, 212, 224, 241, 256,
	273, 291, 312, 331, 356, 378, 399, 418,
];

// Share of revenue and of mapped costs per product, set apart so each
// product shows its own margin.
const PRODUCTS = [
	{ name: "Draftly", slug: "draftly", share: 0.58, costs: 0.5 },
	{ name: "Shipmail", slug: "shipmail", share: 0.29, costs: 0.17 },
	{ name: "Quoteflow", slug: "quoteflow", share: 0.13, costs: 0.33 },
];
const REVENUE_SOURCES = [{ provider: "stripe", share: 1, fee: 0.029 }];
// Share of synced cost per provider, and whether it maps to products.
const COST_PROVIDERS = [
	{ provider: "openai", share: 0.4, mapped: true },
	{ provider: "vercel", share: 0.18, mapped: true },
	{ provider: "anthropic", share: 0.15, mapped: true },
	{ provider: "railway", share: 0.07, mapped: true },
	{ provider: "resend", share: 0.05, mapped: true },
	{ provider: "firecrawl", share: 0.09, mapped: true },
	{ provider: "cloudflare", share: 0.06, mapped: false },
];

const lastDay = (m: string) => {
	const [y, mo] = m.split("-").map(Number);
	return `${m}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, "0")}`;
};

// A month's amount as daily lines, as most providers report it: split over
// the month's days, through today for the current month. A monthly
// connector reports one month-to-date line on the 1st.
function daily(m: string, cents: number, today: string, monthly = false) {
	const n = Number(lastDay(m).slice(8));
	const days = Array.from(
		{ length: n },
		(_, k) => `${m}-${String(k + 1).padStart(2, "0")}`,
	);
	const parts = splitCents(
		cents,
		days.map(() => 1),
	);
	const out = days
		.map((d, k): [string, number] => [d, parts[k]])
		.filter(([d]) => d <= today);
	return monthly
		? [[`${m}-01`, out.reduce((a, [, c]) => a + c, 0)] as [string, number]]
		: out;
}

// Postgres takes at most 65,535 parameters per statement.
async function insertAll<T extends Record<string, unknown>>(
	tx: Tx,
	table: Parameters<Tx["insert"]>[0],
	rows: T[],
) {
	for (let i = 0; i < rows.length; i += 1000)
		await tx.insert(table).values(rows.slice(i, i + 1000) as never);
}

export async function seedWorkspace(
	tx: Tx,
	values: { name: string; slug: string; demo?: boolean },
) {
	const now = new Date();
	const months = REVENUE.map((_, i) => {
		const d = new Date(
			Date.UTC(
				now.getUTCFullYear(),
				now.getUTCMonth() - (REVENUE.length - 1 - i),
				1,
			),
		);
		return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
	});

	const [ws] = await tx
		.insert(schema.workspaces)
		.values({ ...values, baseCurrency: "USD", plan: "indie" })
		.returning();

	const products = await tx
		.insert(schema.products)
		.values(
			PRODUCTS.map((p) => ({ workspaceId: ws.id, name: p.name, slug: p.slug })),
		)
		.returning();

	// Paused: the credentials are fake, so the scheduler must not sync them.
	const creds = await encrypt({ seeded: true });
	const connections = await tx
		.insert(schema.connections)
		.values([
			...REVENUE_SOURCES.map((s) => ({
				workspaceId: ws.id,
				provider: s.provider,
				kind: "revenue" as const,
				authKind: "oauth" as const,
				credentials: creds,
				status: "paused" as const,
				cadenceMinutes: 60,
				lastSyncedAt: Date.now() - 4 * 60_000,
			})),
			...COST_PROVIDERS.map((c) => ({
				workspaceId: ws.id,
				provider: c.provider,
				kind: "cost" as const,
				authKind: "key" as const,
				credentials: creds,
				status: "paused" as const,
				cadenceMinutes: 60,
				lastSyncedAt: Date.now() - 4 * 60_000,
			})),
		])
		.returning();
	const conn = (provider: string) => {
		const c = connections.find((x) => x.provider === provider);
		if (!c) throw new Error(provider);
		return c;
	};

	const revenueLines: (typeof schema.revenueLines.$inferInsert)[] = [];
	const costLines: (typeof schema.costLines.$inferInsert)[] = [];
	const snapshots: (typeof schema.metricSnapshots.$inferInsert)[] = [];

	const today = now.toISOString().slice(0, 10);
	months.forEach((m, i) => {
		for (const s of REVENUE_SOURCES) {
			const c = conn(s.provider);
			for (const p of PRODUCTS) {
				const product = products.find((x) => x.slug === p.slug);
				if (!product) continue;
				const month = Math.round(REVENUE[i] * s.share * p.share * 100);
				for (const [date, net] of daily(m, month, today)) {
					const gross = Math.round(net / (1 - s.fee));
					// Stripe sales carry about 12% sales tax or VAT on top. Polar's
					// metrics report none.
					const tax = s.provider === "stripe" ? Math.round(gross * 0.12) : 0;
					revenueLines.push({
						workspaceId: ws.id,
						connectionId: c.id,
						productId: product.id,
						date,
						currency: "USD",
						grossCents: gross,
						feesCents: gross - net,
						refundsCents: 0,
						netCents: net,
						netBaseCents: net,
						taxCents: tax,
						taxBaseCents: tax,
						kind: "subscription",
						subUnitId: `${s.provider}:${p.slug}`,
						subUnitLabel: p.name,
						externalId: `seed-${date}-${p.slug}`,
					});
				}
			}
			snapshots.push(
				{
					workspaceId: ws.id,
					connectionId: c.id,
					date: lastDay(m),
					metric: "mrr_base_cents",
					value: Math.round(MRR[i] * s.share * 100),
				},
				{
					workspaceId: ws.id,
					connectionId: c.id,
					date: lastDay(m),
					metric: "customers",
					value: Math.round(CUSTOMERS[i] * s.share),
				},
			);
		}
		for (const cp of COST_PROVIDERS) {
			const c = conn(cp.provider);
			const total = Math.round(COSTS[i] * cp.share * 100);
			const monthly = connector(cp.provider).monthly;
			if (cp.mapped) {
				for (const p of PRODUCTS) {
					const product = products.find((x) => x.slug === p.slug);
					const cents = Math.round(total * p.costs);
					for (const [date, amount] of daily(m, cents, today, monthly))
						costLines.push({
							workspaceId: ws.id,
							connectionId: c.id,
							productId: product?.id,
							provider: cp.provider,
							date,
							currency: "USD",
							amountCents: amount,
							amountBaseCents: amount,
							service: cp.provider,
							subUnitId: `${cp.provider}:${p.slug}`,
							subUnitLabel: p.name,
							source: "sync",
							externalId: `seed-${cp.provider}-${date}-${p.slug}`,
						});
				}
			} else {
				for (const [date, amount] of daily(m, total, today, monthly))
					costLines.push({
						workspaceId: ws.id,
						connectionId: c.id,
						productId: null,
						provider: cp.provider,
						date,
						currency: "USD",
						amountCents: amount,
						amountBaseCents: amount,
						service: cp.provider,
						source: "sync",
						externalId: `seed-${cp.provider}-${date}`,
					});
			}
		}
	});

	// Mapped providers get a mapping row per product, as a user would set.
	const mappings: (typeof schema.productMappings.$inferInsert)[] = [];
	const mappedProviders = [
		...REVENUE_SOURCES.map((s) => s.provider),
		...COST_PROVIDERS.filter((x) => x.mapped).map((x) => x.provider),
	];
	for (const provider of mappedProviders) {
		for (const p of PRODUCTS) {
			const product = products.find((x) => x.slug === p.slug);
			if (!product) continue;
			mappings.push({
				workspaceId: ws.id,
				connectionId: conn(provider).id,
				subUnitId: `${provider}:${p.slug}`,
				productId: product.id,
			});
		}
	}
	await tx.insert(schema.productMappings).values(mappings);
	await insertAll(tx, schema.revenueLines, revenueLines);
	await insertAll(tx, schema.costLines, costLines);
	await tx.insert(schema.metricSnapshots).values(snapshots);

	const draftly = products.find((p) => p.slug === "draftly");
	const shipmail = products.find((p) => p.slug === "shipmail");
	// Providers without a connector are flat costs, as a user would add them.
	// The base amount is set so reading them never writes it back.
	const flat = (
		name: string,
		provider: string,
		amountCents: number,
		interval: "month" | "year",
		productId?: string,
	) => ({
		workspaceId: ws.id,
		productId,
		name,
		provider,
		amountCents,
		amountBaseCents: amountCents,
		currency: "USD",
		interval,
		startsOn: `${months[0]}-01`,
	});
	await tx
		.insert(schema.flatCosts)
		.values([
			flat("Supabase Pro", "supabase", 2500, "month"),
			flat("draftly.app", "domains", 1400, "year", draftly?.id),
			flat("shipmail.dev", "domains", 1400, "year", shipmail?.id),
		]);

	await tx.insert(schema.alertRules).values([
		{ workspaceId: ws.id, kind: "cost_spike", threshold: 1 },
		{ workspaceId: ws.id, kind: "margin_floor", threshold: 0.6 },
		{ workspaceId: ws.id, kind: "sync_failure" },
	]);

	return {
		ws,
		products: products.length,
		connections: connections.length,
		lines: revenueLines.length + costLines.length,
	};
}
