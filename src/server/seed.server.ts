import "@tanstack/react-start/server-only";
import { type db, schema } from "#/db";
import { encrypt } from "#/lib/crypto";

// Sample numbers for `pnpm db:seed` and the public demo: twelve months
// ending this month, three products, two revenue sources, five cost
// providers and a few flat costs.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const REVENUE = [
	6120, 6480, 7010, 7390, 7820, 8350, 8910, 9420, 10080, 10760, 11540, 12480,
];
const COSTS = [
	1480, 1520, 1610, 1740, 1890, 2050, 2210, 2380, 2590, 2770, 2960, 3112,
];
const MRR = [
	5900, 6200, 6700, 7050, 7500, 8000, 8550, 9050, 9700, 10350, 11100, 11900,
];
const CUSTOMERS = [212, 224, 241, 256, 273, 291, 312, 331, 356, 378, 399, 418];

const PRODUCTS = [
	{ name: "Draftly", slug: "draftly", share: 0.58 },
	{ name: "Shipmail", slug: "shipmail", share: 0.29 },
	{ name: "Quoteflow", slug: "quoteflow", share: 0.13 },
];
const REVENUE_SOURCES = [
	{ provider: "stripe", share: 0.79, fee: 0.029 },
	{ provider: "polar", share: 0.21, fee: 0.05 },
];
// Share of synced cost per provider, and whether it maps to products.
const COST_PROVIDERS = [
	{ provider: "openai", share: 0.46, mapped: true },
	{ provider: "vercel", share: 0.21, mapped: true },
	{ provider: "anthropic", share: 0.16, mapped: true },
	{ provider: "railway", share: 0.07, mapped: true },
	{ provider: "cloudflare", share: 0.04, mapped: false },
];

const lastDay = (m: string) => {
	const [y, mo] = m.split("-").map(Number);
	return `${m}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, "0")}`;
};

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

	months.forEach((m, i) => {
		const date = `${m}-01`;
		for (const s of REVENUE_SOURCES) {
			const c = conn(s.provider);
			for (const p of PRODUCTS) {
				const product = products.find((x) => x.slug === p.slug);
				if (!product) continue;
				const net = Math.round(REVENUE[i] * s.share * p.share * 100);
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
					externalId: `seed-${m}-${p.slug}`,
				});
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
			if (cp.mapped) {
				for (const p of PRODUCTS) {
					const product = products.find((x) => x.slug === p.slug);
					costLines.push({
						workspaceId: ws.id,
						connectionId: c.id,
						productId: product?.id,
						provider: cp.provider,
						date,
						currency: "USD",
						amountCents: Math.round(total * p.share),
						amountBaseCents: Math.round(total * p.share),
						service: cp.provider,
						subUnitId: `${cp.provider}:${p.slug}`,
						subUnitLabel: p.name,
						source: "sync",
						externalId: `seed-${cp.provider}-${m}-${p.slug}`,
					});
				}
			} else {
				costLines.push({
					workspaceId: ws.id,
					connectionId: c.id,
					productId: null,
					provider: cp.provider,
					date,
					currency: "USD",
					amountCents: total,
					amountBaseCents: total,
					service: cp.provider,
					source: "sync",
					externalId: `seed-${cp.provider}-${m}`,
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
	await tx.insert(schema.revenueLines).values(revenueLines);
	await tx.insert(schema.costLines).values(costLines);
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
			flat("Resend Pro", "resend", 2000, "month"),
			flat("Firecrawl", "firecrawl", 1900, "month", draftly?.id),
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
