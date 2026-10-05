import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { evaluateAlerts } from "./alerts.server";
import { currentWorkspace } from "./workspace.server";

export type AlertRow = {
	id: string;
	title: string;
	detail: string | null;
	tone: "negative" | "pending" | "ink";
	openedAt: number;
	resolvedAt: number | null;
};

export type RuleRow = {
	id: string;
	kind: "cost_spike" | "margin_floor" | "sync_failure";
	threshold: number | null;
	channel: "email";
	enabled: boolean;
};

export const getAlerts = createServerFn({ method: "GET" }).handler(
	async (): Promise<{ alerts: AlertRow[]; rules: RuleRow[] }> => {
		const ws = await currentWorkspace();
		await evaluateAlerts(ws.id);
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
		return {
			alerts: alerts.map((a) => ({
				id: a.id,
				title: a.title,
				detail: a.detail,
				tone: a.tone,
				openedAt: a.openedAt,
				resolvedAt: a.resolvedAt,
			})),
			rules: rules.map((r) => ({
				id: r.id,
				kind: r.kind,
				threshold: r.threshold,
				channel: r.channel,
				enabled: r.enabled,
			})),
		};
	},
);

export const setRuleEnabled = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string(), enabled: z.boolean() }))
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		await db
			.update(schema.alertRules)
			.set({ enabled: data.enabled })
			.where(
				and(
					eq(schema.alertRules.id, data.id),
					eq(schema.alertRules.workspaceId, ws.id),
				),
			);
		return { ok: true };
	});
