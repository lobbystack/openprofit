import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authSchema, db, schema } from "#/db";
import { CURRENCIES, TimeZone } from "#/lib/format";
import { PLANS } from "#/lib/plans";
import { requireUser } from "./auth.server";
import { isCloud } from "./billing.server";
import { convert } from "./fx.server";
import { syncConnection } from "./sync.server";
import { currentWorkspace } from "./workspace.server";

export type Settings = {
	name: string;
	currency: string;
	plan: "free" | "indie" | "pro";
	cadenceMinutes: number;
	weeklyEmail: boolean;
	weeklyDay: number;
	weeklyHour: number;
	timezone: string;
	telemetry: boolean;
	// The signed-in user's analytics switch: product events and replay.
	analytics: boolean;
	// Hosted instance: billing rows show and the plan caps the cadence.
	cloud: boolean;
	// POSTHOG_KEY is set, so the analytics switch does something.
	posthog: boolean;
};

export const getSettings = createServerFn({ method: "GET" }).handler(
	async (): Promise<Settings> => {
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		const [conn, me] = await Promise.all([
			db.query.connections.findFirst({
				where: eq(schema.connections.workspaceId, ws.id),
			}),
			db.query.user.findFirst({
				where: eq(authSchema.user.id, user.id),
				columns: { analytics: true },
			}),
		]);
		return {
			name: ws.name,
			currency: ws.baseCurrency,
			plan: ws.plan,
			cadenceMinutes:
				conn?.cadenceMinutes ?? (isCloud ? PLANS[ws.plan].cadenceMinutes : 60),
			weeklyEmail: ws.weeklyEmail,
			weeklyDay: ws.weeklyDay,
			weeklyHour: ws.weeklyHour,
			timezone: ws.timezone,
			telemetry: ws.telemetry,
			analytics: me?.analytics ?? true,
			cloud: isCloud,
			posthog: !!process.env.POSTHOG_KEY,
		};
	},
);

export const updateSettings = createServerFn({ method: "POST" })
	.validator(
		z.object({
			name: z.string().trim().min(1).max(60).optional(),
			cadenceMinutes: z
				.union([z.literal(15), z.literal(60), z.literal(360), z.literal(1440)])
				.optional(),
			weeklyEmail: z.boolean().optional(),
			weeklyDay: z.number().int().min(0).max(6).optional(),
			weeklyHour: z.number().int().min(0).max(23).optional(),
			timezone: TimeZone.optional(),
			telemetry: z.boolean().optional(),
			analytics: z.boolean().optional(),
			currency: z.enum(CURRENCIES).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		if (data.analytics !== undefined)
			await db
				.update(authSchema.user)
				.set({ analytics: data.analytics })
				.where(eq(authSchema.user.id, user.id));
		// Drizzle leaves undefined fields out of the update.
		const patch = {
			name: data.name,
			weeklyEmail: data.weeklyEmail,
			weeklyDay: data.weeklyDay,
			weeklyHour: data.weeklyHour,
			timezone: data.timezone,
			telemetry: data.telemetry,
		};
		if (Object.values(patch).some((v) => v !== undefined))
			await db
				.update(schema.workspaces)
				.set(patch)
				.where(eq(schema.workspaces.id, ws.id));
		if (data.currency !== undefined && data.currency !== ws.baseCurrency) {
			await db
				.update(schema.workspaces)
				.set({ baseCurrency: data.currency })
				.where(eq(schema.workspaces.id, ws.id));
			// Re-express every stored line in the new base currency.
			const [rev, cost] = await Promise.all([
				db.query.revenueLines.findMany({
					where: eq(schema.revenueLines.workspaceId, ws.id),
				}),
				db.query.costLines.findMany({
					where: eq(schema.costLines.workspaceId, ws.id),
				}),
			]);
			for (const l of rev) {
				await db
					.update(schema.revenueLines)
					.set({
						netBaseCents: await convert(
							l.netCents,
							l.currency,
							data.currency,
							l.date,
						),
						taxBaseCents: await convert(
							l.taxCents,
							l.currency,
							data.currency,
							l.date,
						),
					})
					.where(eq(schema.revenueLines.id, l.id));
			}
			for (const l of cost) {
				await db
					.update(schema.costLines)
					.set({
						amountBaseCents: await convert(
							l.amountCents,
							l.currency,
							data.currency,
							l.date,
						),
					})
					.where(eq(schema.costLines.id, l.id));
			}
			// Flat costs have no date of their own; they convert at today's rate.
			const today = new Date().toISOString().slice(0, 10);
			const flats = await db.query.flatCosts.findMany({
				where: eq(schema.flatCosts.workspaceId, ws.id),
			});
			for (const f of flats) {
				await db
					.update(schema.flatCosts)
					.set({
						amountBaseCents: await convert(
							f.amountCents,
							f.currency,
							data.currency,
							today,
						),
					})
					.where(eq(schema.flatCosts.id, f.id));
			}
			// MRR snapshots are stored in base cents; a sync rewrites today's.
			const conns = await db.query.connections.findMany({
				where: eq(schema.connections.workspaceId, ws.id),
			});
			void Promise.allSettled(
				conns
					.filter((c) => c.status !== "paused")
					.map((c) => syncConnection(c)),
			);
		}
		if (data.cadenceMinutes !== undefined) {
			const floor = isCloud ? PLANS[ws.plan].cadenceMinutes : 0;
			await db
				.update(schema.connections)
				.set({ cadenceMinutes: Math.max(data.cadenceMinutes, floor) })
				.where(eq(schema.connections.workspaceId, ws.id));
		}
		return { ok: true };
	});
