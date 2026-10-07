import { createServerFn } from "@tanstack/react-start";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { issueToken } from "./api.server";
import { requireUser, sessionUser } from "./auth.server";
import {
	type CliLoginState,
	cliLoginState,
	decideCliLogin,
} from "./cli.server";
import { currentWorkspace, userWorkspaces } from "./workspace.server";

export type TokenRow = {
	id: string;
	name: string;
	prefix: string;
	scope: "read" | "write";
	lastUsedAt: number | null;
	createdAt: number;
};

export const listTokens = createServerFn({ method: "GET" }).handler(
	async (): Promise<TokenRow[]> => {
		const ws = await currentWorkspace();
		return db.query.apiTokens.findMany({
			where: and(
				eq(schema.apiTokens.workspaceId, ws.id),
				isNull(schema.apiTokens.revokedAt),
			),
			columns: {
				id: true,
				name: true,
				prefix: true,
				scope: true,
				lastUsedAt: true,
				createdAt: true,
			},
			orderBy: (t, { desc }) => desc(t.createdAt),
		});
	},
);

// The token is returned this once; only its hash is kept.
export const createToken = createServerFn({ method: "POST" })
	.validator(
		z.object({
			name: z.string().trim().min(1).max(60),
			scope: z.enum(["read", "write"]),
		}),
	)
	.handler(async ({ data }) => {
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		const { token } = await issueToken({
			workspaceId: ws.id,
			userId: user.id,
			...data,
		});
		return { token };
	});

export const revokeToken = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		await db
			.update(schema.apiTokens)
			.set({ revokedAt: Date.now() })
			.where(
				and(
					eq(schema.apiTokens.id, data.id),
					eq(schema.apiTokens.workspaceId, ws.id),
				),
			);
		return { ok: true };
	});

// The /cli approval page. Null when signed out.
export const getCliLogin = createServerFn({ method: "GET" })
	.validator(z.object({ code: z.string().max(20) }))
	.handler(
		async ({
			data,
		}): Promise<{
			state: CliLoginState;
			workspaces: { id: string; name: string }[];
		} | null> => {
			const user = await sessionUser();
			if (!user) return null;
			const [state, workspaces] = await Promise.all([
				cliLoginState(data.code),
				userWorkspaces(user.id),
			]);
			return { state, workspaces };
		},
	);

// Approves the code for a workspace, or cancels it with no workspace.
export const decideCli = createServerFn({ method: "POST" })
	.validator(
		z.object({ code: z.string().max(20), workspaceId: z.string().nullable() }),
	)
	.handler(async ({ data }) => {
		const user = await requireUser();
		if (data.workspaceId) {
			const mine = await userWorkspaces(user.id);
			if (!mine.some((w) => w.id === data.workspaceId))
				throw new Error("Not found");
		}
		const ok = await decideCliLogin(
			data.code,
			data.workspaceId
				? { userId: user.id, workspaceId: data.workspaceId }
				: null,
		);
		if (!ok) throw new Error("This code has expired. Run the login again.");
		return { ok };
	});
