import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { capture, identifyWorkspaces } from "./analytics.server";
import { requireUser } from "./auth.server";
import { isCloud } from "./billing.server";
import { createWorkspace, rememberWorkspace } from "./workspace.server";

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF"] as const;

// An IANA time zone name the server's Intl knows, such as "Europe/Paris".
export const TimeZone = z.string().refine((timeZone) => {
	try {
		new Intl.DateTimeFormat("en-US", { timeZone });
		return true;
	} catch {
		return false;
	}
});

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
