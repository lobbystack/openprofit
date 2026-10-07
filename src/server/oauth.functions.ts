import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser, sessionUser } from "./auth.server";
import { decide, openConsent, redirectTarget } from "./oauth.server";
import { userWorkspaces } from "./workspace.server";

// The encrypted request from /oauth/authorize.
const Sealed = z.string().max(8000);

// The /oauth/consent page. "signed-out" sends the user to /login first.
export const getOAuthConsent = createServerFn({ method: "GET" })
	.validator(z.object({ request: Sealed }))
	.handler(async ({ data }) => {
		const r = await openConsent(data.request);
		if (!r) return { state: "expired" as const };
		const user = await sessionUser();
		if (!user) return { state: "signed-out" as const };
		return {
			state: "ready" as const,
			client: { name: r.name, host: r.host },
			target: redirectTarget(r.redirectUri),
			scope: r.scope,
			workspaces: await userWorkspaces(user.id),
		};
	});

// Approves for a workspace, or denies with no workspace. Returns the client's
// redirect URL with the code or the error.
export const decideOAuth = createServerFn({ method: "POST" })
	.validator(
		z.object({
			request: Sealed,
			workspaceId: z.string().nullable(),
			scope: z.enum(["read", "write"]),
		}),
	)
	.handler(async ({ data }) => {
		const user = await requireUser();
		const r = await openConsent(data.request);
		if (!r) throw new Error("This request has expired. Connect again.");
		if (data.workspaceId) {
			const mine = await userWorkspaces(user.id);
			if (!mine.some((w) => w.id === data.workspaceId))
				throw new Error("Not found");
		}
		const url = await decide(
			r,
			data.workspaceId
				? { userId: user.id, workspaceId: data.workspaceId, scope: data.scope }
				: null,
		);
		return { url };
	});
