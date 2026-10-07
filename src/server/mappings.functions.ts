import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { capture } from "./analytics.server";
import { requireUser } from "./auth.server";
import {
	assignConnection,
	assignSubUnit,
	type ConnectionDetail,
	connectionDetail,
} from "./mappings.server";
import { currentWorkspace } from "./workspace.server";

export type { ConnectionDetail, SubUnit } from "./mappings.server";

export const getConnection = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }): Promise<ConnectionDetail> => {
		const detail = await connectionDetail(await currentWorkspace(), data.id);
		if (!detail) throw notFound();
		return detail;
	});

export const setMapping = createServerFn({ method: "POST" })
	.validator(
		z.object({
			connectionId: z.string(),
			subUnitId: z.string(),
			productId: z.string().nullable(),
		}),
	)
	.handler(async ({ data }) => {
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		const conn = await assignSubUnit(ws, data);
		if (!conn) throw new Error("Not found");
		await capture(user.id, ws.id, "mapping_changed", {
			provider: conn.provider,
			scope: "sub_unit",
			assigned: data.productId !== null,
		});
		return { ok: true };
	});

export const setConnectionProduct = createServerFn({ method: "POST" })
	.validator(
		z.object({ connectionId: z.string(), productId: z.string().nullable() }),
	)
	.handler(async ({ data }) => {
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		const conn = await assignConnection(ws, data);
		if (!conn) throw new Error("Not found");
		await capture(user.id, ws.id, "mapping_changed", {
			provider: conn.provider,
			scope: "connection",
			assigned: data.productId !== null,
		});
		return { ok: true };
	});
