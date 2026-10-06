import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CURRENCIES, TimeZone } from "#/lib/format";
import { capture, identifyWorkspaces } from "./analytics.server";
import { requireUser } from "./auth.server";
import { isCloud } from "./billing.server";
import { createWorkspace, rememberWorkspace } from "./workspace.server";

const Input = z.object({
	name: z.string().trim().min(1).max(60),
	currency: z.enum(CURRENCIES),
	// The browser's, so the weekly email defaults to Monday 09:00 local time.
	timezone: TimeZone.optional(),
});

export const createWorkspaceFn = createServerFn({ method: "POST" })
	.validator(Input)
	.handler(async ({ data }) => {
		const user = await requireUser();
		const ws = await createWorkspace(user.id, data);
		rememberWorkspace(ws.id);
		await capture(user.id, ws.id, "workspace_created", {
			currency: data.currency,
			plan: ws.plan,
		});
		if (isCloud) await identifyWorkspaces(ws.id);
		return { id: ws.id };
	});
