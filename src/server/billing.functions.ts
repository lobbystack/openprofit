import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { capture } from "./analytics.server";
import { requireUser } from "./auth.server";
import { checkoutUrl, isCloud, portalUrl } from "./billing.server";
import { currentWorkspace } from "./workspace.server";

export const startCheckout = createServerFn({ method: "POST" })
	.validator(z.object({ plan: z.enum(["indie", "pro"]) }))
	.handler(async ({ data }) => {
		if (!isCloud) throw new Error("Billing is off on self-hosted instances");
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		try {
			const url = await checkoutUrl(ws, data.plan, user);
			await capture(user.id, ws.id, "checkout_started", {
				plan: data.plan,
				from_plan: ws.plan,
			});
			return { url };
		} catch (err) {
			console.error("[billing] checkout", err);
			throw err;
		}
	});

export const openPortal = createServerFn({ method: "POST" }).handler(
	async () => {
		if (!isCloud) throw new Error("Billing is off on self-hosted instances");
		const ws = await currentWorkspace();
		return { url: await portalUrl(ws) };
	},
);
