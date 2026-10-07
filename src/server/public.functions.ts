import { notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { SITE_URL } from "#/lib/app";
import { sessionUser } from "./auth.server";
import { isCloud } from "./billing.server";
import {
	findPublic,
	type OpenRow,
	openBoard,
	type PublicPage,
	publicPage,
} from "./public.server";
import { currentWorkspace } from "./workspace.server";

export type PublicProduct = PublicPage & {
	// Absolute page address, for the badge snippets and the social image.
	url: string;
	// The viewer belongs to the workspace: the page shows the badge snippets.
	owner: boolean;
};

// No auth: anyone with the link can read a product whose page is on.
export const getPublicProduct = createServerFn({ method: "GET" })
	.validator(z.object({ workspace: z.string(), product: z.string() }))
	.handler(async ({ data }): Promise<PublicProduct> => {
		const found = await findPublic(data.workspace, data.product);
		if (!found) throw notFound();
		const user = await sessionUser();
		const [page, member] = await Promise.all([
			publicPage(found),
			user &&
				db.query.workspaceMembers.findFirst({
					where: and(
						eq(schema.workspaceMembers.workspaceId, found.ws.id),
						eq(schema.workspaceMembers.userId, user.id),
					),
				}),
		]);
		const origin = process.env.APP_URL ?? new URL(getRequest().url).origin;
		return {
			...page,
			url: `${origin}/p/${data.workspace}/${data.product}`,
			owner: !!member,
		};
	});

// /open is the hosted leaderboard; self-hosted instances send visitors there.
export const getOpenBoard = createServerFn({ method: "GET" }).handler(
	async (): Promise<OpenRow[]> => {
		if (!isCloud) throw redirect({ href: `${SITE_URL}/open` });
		return openBoard();
	},
);

export const setPublicPage = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.string(),
			mode: z.enum(["off", "full", "revenue", "percent"]),
		}),
	)
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		await db
			.update(schema.products)
			.set({ publicPage: data.mode })
			.where(
				and(
					eq(schema.products.id, data.id),
					eq(schema.products.workspaceId, ws.id),
				),
			);
		const product = await db.query.products.findFirst({
			where: eq(schema.products.id, data.id),
		});
		return { slug: product?.slug ?? null, workspace: ws.slug };
	});
