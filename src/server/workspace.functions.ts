import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "#/db";
import { PLANS } from "#/lib/plans";
import { requireUser } from "./auth.server";
import { isCloud } from "./billing.server";
import { boot } from "./boot.server";
import { demoWorkspace } from "./demo.server";
import { convert } from "./fx.server";
import { overview } from "./overview.server";
import {
	currentProduct,
	currentWorkspace,
	rememberProduct,
	rememberWorkspace,
	userWorkspaces,
} from "./workspace.server";

export type WorkspaceSummary = {
	id: string;
	name: string;
	currency: string;
	plan: "free" | "indie" | "pro";
	// Hosted instance and MRR past the plan's cap: the shell shows a notice.
	overCap: boolean;
	userId: string;
	email: string;
	// The user's Analytics switch; the browser records replay when on.
	analytics: boolean;
	workspaces: { id: string; name: string }[];
	products: { id: string; name: string; profit: number }[];
	// The switcher's product; null is All.
	productId: string | null;
};

export const getWorkspace = createServerFn({ method: "GET" }).handler(
	async (): Promise<WorkspaceSummary> => {
		boot();
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		const [data, product] = await Promise.all([
			overview(ws),
			currentProduct(ws),
		]);
		const cap = PLANS[ws.plan].mrrCapCents;
		// Plan limits are in US dollars; MRR is in the workspace's currency.
		const mrr =
			isCloud && cap !== null
				? await convert(
						Math.round((data.series.mrr.at(-1) ?? 0) * 100),
						ws.baseCurrency,
						"USD",
						new Date().toISOString().slice(0, 10),
					).catch(() => 0)
				: 0;
		return {
			id: ws.id,
			name: ws.name,
			currency: ws.baseCurrency,
			plan: ws.plan,
			overCap: isCloud && cap !== null && mrr > cap,
			userId: user.id,
			email: user.email,
			analytics: user.analytics,
			workspaces: await userWorkspaces(user.id),
			products: data.byProduct
				.filter((p) => p.id !== "unassigned")
				.map((p) => ({ id: p.id, name: p.name, profit: p.revenue - p.costs })),
			productId: product?.id ?? null,
		};
	},
);

// The shell's summary for /demo. No user: anyone can read it.
export const getDemoWorkspace = createServerFn({ method: "GET" }).handler(
	async (): Promise<WorkspaceSummary> => {
		const ws = await demoWorkspace();
		const [data, product] = await Promise.all([
			overview(ws),
			currentProduct(ws),
		]);
		return {
			id: ws.id,
			name: ws.name,
			currency: ws.baseCurrency,
			plan: ws.plan,
			overCap: false,
			userId: "",
			email: "",
			analytics: false,
			workspaces: [{ id: ws.id, name: ws.name }],
			products: data.byProduct
				.filter((p) => p.id !== "unassigned")
				.map((p) => ({ id: p.id, name: p.name, profit: p.revenue - p.costs })),
			productId: product?.id ?? null,
		};
	},
);

export const switchWorkspace = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const user = await requireUser();
		const mine = await userWorkspaces(user.id);
		if (!mine.some((w) => w.id === data.id)) throw new Error("Not found");
		rememberWorkspace(data.id);
		// A product belongs to one workspace, so the new one starts on All.
		rememberProduct(null);
		return { ok: true };
	});

// Picks the product the app narrows to, or All with null. `demo` picks
// one of the public demo's products, signed in or not.
export const switchProduct = createServerFn({ method: "POST" })
	.validator(
		z.object({ id: z.string().nullable(), demo: z.boolean().optional() }),
	)
	.handler(async ({ data }) => {
		const ws = data.demo ? await demoWorkspace() : await currentWorkspace();
		if (data.id) {
			const owned = await db.query.products.findFirst({
				where: and(
					eq(schema.products.id, data.id),
					eq(schema.products.workspaceId, ws.id),
				),
			});
			if (!owned) throw new Error("Not found");
		}
		rememberProduct(data.id, ws.demo);
		return { ok: true };
	});
