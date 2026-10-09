import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { BooksSettingsInput, booksSettingsPatch } from "#/lib/books-settings";
import { Day } from "#/lib/costs";
import { currentWorkspace } from "./workspace.server";

// Books settings (docs/BOOKS.md): incorporation, country and region, and who
// pays each cost connection and manual cost.
export const getBooksSettings = createServerFn({ method: "GET" }).handler(
	async () => {
		const ws = await currentWorkspace();
		const [connections, costs] = await Promise.all([
			db.query.connections.findMany({
				where: and(
					eq(schema.connections.workspaceId, ws.id),
					eq(schema.connections.kind, "cost"),
				),
				columns: {
					id: true,
					provider: true,
					label: true,
					paidWith: true,
					paidWithSince: true,
				},
				orderBy: (c, { asc }) => asc(c.createdAt),
			}),
			db.query.flatCosts.findMany({
				where: eq(schema.flatCosts.workspaceId, ws.id),
				columns: {
					id: true,
					name: true,
					interval: true,
					paidWith: true,
					paidWithSince: true,
				},
				orderBy: (f, { asc }) => asc(f.name),
			}),
		]);
		return {
			incorporatedOn: ws.incorporatedOn,
			country: ws.country,
			region: ws.region,
			connections,
			costs,
		};
	},
);

export const updateBooksSettings = createServerFn({ method: "POST" })
	.validator(BooksSettingsInput)
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		await db
			.update(schema.workspaces)
			.set(booksSettingsPatch(data))
			.where(eq(schema.workspaces.id, ws.id));
		return { ok: true };
	});

// Who pays a cost connection or a manual cost, and since when (null: always).
export const setPaidWith = createServerFn({ method: "POST" })
	.validator(
		z.object({
			target: z.enum(["connection", "cost"]),
			id: z.string(),
			paidWith: z.enum(["personal", "company"]),
			paidWithSince: Day.nullable(),
		}),
	)
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		const t =
			data.target === "connection" ? schema.connections : schema.flatCosts;
		const [row] = await db
			.update(t)
			.set({ paidWith: data.paidWith, paidWithSince: data.paidWithSince })
			.where(and(eq(t.id, data.id), eq(t.workspaceId, ws.id)))
			.returning({ id: t.id });
		if (!row) throw new Error("Not found");
		return { ok: true };
	});
