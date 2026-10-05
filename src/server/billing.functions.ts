import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth.server";
import { checkoutUrl, isCloud, portalUrl } from "./billing.server";
import { currentWorkspace } from "./workspace.server";

export const startCheckout = createServerFn({ method: "POST" })
	.validator(z.object({ plan: z.enum(["indie", "pro"]) }))
	.handler(async ({ data }) => {
		if (!isCloud) throw new Error("Billing is off on self-hosted instances");
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		return { url: await checkoutUrl(ws, data.plan, user.email) };
	});

export const openPortal = createServerFn({ method: "POST" }).handler(
	async () => {
		if (!isCloud) throw new Error("Billing is off on self-hosted instances");
		const ws = await currentWorkspace();
		return { url: await portalUrl(ws) };
	},
);
