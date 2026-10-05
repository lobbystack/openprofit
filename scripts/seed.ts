// Seeds one workspace with twelve months of numbers. Run with `pnpm db:seed`.
import { eq } from "drizzle-orm";
import { authSchema, db, schema } from "#/db";
import { encrypt } from "#/lib/crypto";

const MONTHS = 12;
const now = new Date();
const months = Array.from({ length: MONTHS }, (_, i) => {
	const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS - 1 - i), 1));
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
});
const lastDay = (m: string) => {
	const [y, mo] = m.split("-").map(Number);
	return `${m}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, "0")}`;
};

const REVENUE = [6120, 6480, 7010, 7390, 7820, 8350, 8910, 9420, 10080, 10760, 11540, 12480];
const COSTS = [1480, 1520, 1610, 1740, 1890, 2050, 2210, 2380, 2590, 2770, 2960, 3112];
const MRR = [5900, 6200, 6700, 7050, 7500, 8000, 8550, 9050, 9700, 10350, 11100, 11900];
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
	{ provider: "supabase", share: 0.03, mapped: false },
	{ provider: "resend", share: 0.03, mapped: false },
];

// `--owner=you@example.com` makes that signed-in user a member of the
// seeded workspace.
async function attachOwner(workspaceId: string, email: string) {
	const user = await db.query.user.findFirst({
		where: eq(authSchema.user.email, email),
	});
	if (!user) {
		console.log(`No user with email ${email}. Sign in once, then rerun.`);
		return;
	}
	await db
		.insert(schema.workspaceMembers)
		.values({ workspaceId, userId: user.id, role: "owner" })
		.onConflictDoNothing();
	console.log(`${email} now owns the seeded workspace.`);
}

async function main() {
	const owner = process.argv.find((a) => a.startsWith("--owner="))?.slice(8);
	const existing = await db.query.workspaces.findFirst();
	if (existing) {
		if (owner) await attachOwner(existing.id, owner);
		else console.log(`Workspace "${existing.name}" exists. Delete data/openprofit.db to reseed.`);
		return;
	}
	const [ws] = await db
		.insert(schema.workspaces)
		.values({ name: "Acme Labs", slug: "acme", baseCurrency: "USD", plan: "indie" })
		.returning();

	const products = await db
		.insert(schema.products)
		.values(PRODUCTS.map((p) => ({ workspaceId: ws.id, name: p.name, slug: p.slug })))
		.returning();

	const creds = await encrypt({ seeded: true });
	const connections = await db
		.insert(schema.connections)
		.values([
			...REVENUE_SOURCES.map((s) => ({
				workspaceId: ws.id,
				provider: s.provider,
				kind: "revenue" as const,
				authKind: "oauth" as const,
				credentials: creds,
				cadenceMinutes: 60,
				lastSyncedAt: Date.now() - 4 * 60_000,
			})),
			...COST_PROVIDERS.map((c) => ({
				workspaceId: ws.id,
				provider: c.provider,
				kind: "cost" as const,
				authKind: "key" as const,
				credentials: creds,
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
					kind: "subscription",
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

	// Mapped providers get a mapping row per product, as a real sync would.
	const mappings: (typeof schema.productMappings.$inferInsert)[] = [];
	for (const cp of COST_PROVIDERS.filter((x) => x.mapped)) {
		for (const p of PRODUCTS) {
			const product = products.find((x) => x.slug === p.slug);
			if (!product) continue;
			mappings.push({
				workspaceId: ws.id,
				connectionId: conn(cp.provider).id,
				subUnitId: `${cp.provider}:${p.slug}`,
				subUnitLabel: `${p.name} (${cp.provider})`,
				productId: product.id,
			});
		}
	}
	await db.insert(schema.productMappings).values(mappings);
	await db.insert(schema.revenueLines).values(revenueLines);
	await db.insert(schema.costLines).values(costLines);
	await db.insert(schema.metricSnapshots).values(snapshots);

	const draftly = products.find((p) => p.slug === "draftly");
	const shipmail = products.find((p) => p.slug === "shipmail");
	await db.insert(schema.flatCosts).values([
		{
			workspaceId: ws.id,
			productId: draftly?.id,
			name: "Firecrawl",
			provider: "firecrawl",
			amountCents: 1900,
			currency: "USD",
			interval: "month",
			startsOn: `${months[0]}-01`,
		},
		{
			workspaceId: ws.id,
			productId: draftly?.id,
			name: "draftly.app",
			provider: "domains",
			amountCents: 1400,
			currency: "USD",
			interval: "year",
			startsOn: `${months[0]}-01`,
		},
		{
			workspaceId: ws.id,
			productId: shipmail?.id,
			name: "shipmail.dev",
			provider: "domains",
			amountCents: 1400,
			currency: "USD",
			interval: "year",
			startsOn: `${months[0]}-01`,
		},
	]);

	await db.insert(schema.alertRules).values([
		{ workspaceId: ws.id, kind: "cost_spike", threshold: 1 },
		{ workspaceId: ws.id, kind: "margin_floor", threshold: 0.6 },
		{ workspaceId: ws.id, kind: "sync_failure" },
	]);

	if (owner) await attachOwner(ws.id, owner);
	console.log(
		`Seeded ${ws.name}: ${products.length} products, ${connections.length} connections, ${revenueLines.length + costLines.length} lines.`,
	);
}

main().then(() => process.exit(0));
