import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { PLANS } from "#/lib/plans";
import { requireUser } from "./auth.server";
import { isCloud } from "./billing.server";
import { sendEmail } from "./email.server";
import { weeklySummary } from "./weekly.server";
import { currentWorkspace } from "./workspace.server";

export type Settings = {
	name: string;
	currency: string;
	plan: "free" | "indie" | "pro";
	cadenceMinutes: number;
	weeklyEmail: boolean;
	telemetry: boolean;
	email: string;
	// Hosted instance: billing rows show and the plan caps the cadence.
	cloud: boolean;
};

export const getSettings = createServerFn({ method: "GET" }).handler(
	async (): Promise<Settings> => {
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		const conn = await db.query.connections.findFirst({
			where: eq(schema.connections.workspaceId, ws.id),
		});
		return {
			name: ws.name,
			currency: ws.baseCurrency,
			plan: ws.plan,
			cadenceMinutes: conn?.cadenceMinutes ?? 60,
			weeklyEmail: ws.weeklyEmail,
			telemetry: ws.telemetry,
			email: user.email,
			cloud: isCloud,
		};
	},
);

export const CADENCES = [15, 60, 360, 1440] as const;

export const updateSettings = createServerFn({ method: "POST" })
	.validator(
		z.object({
			name: z.string().trim().min(1).max(60).optional(),
			cadenceMinutes: z
				.union([z.literal(15), z.literal(60), z.literal(360), z.literal(1440)])
				.optional(),
			weeklyEmail: z.boolean().optional(),
			telemetry: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		if (
			data.name !== undefined ||
			data.weeklyEmail !== undefined ||
			data.telemetry !== undefined
		) {
			await db
				.update(schema.workspaces)
				.set({
					...(data.name !== undefined ? { name: data.name } : {}),
					...(data.weeklyEmail !== undefined
						? { weeklyEmail: data.weeklyEmail }
						: {}),
					...(data.telemetry !== undefined
						? { telemetry: data.telemetry }
						: {}),
				})
				.where(eq(schema.workspaces.id, ws.id));
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

export const sendWeeklyNow = createServerFn({ method: "POST" }).handler(
	async () => {
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		const summary = await weeklySummary(ws.id);
		if (!summary) return { ok: false };
		await sendEmail(user.email, summary.subject, summary.text);
		return { ok: true };
	},
);
