import { createServerFn } from "@tanstack/react-start";
import { PLANS } from "#/lib/plans";
import { requireUser } from "./auth.server";
import { isCloud } from "./billing.server";
import { boot } from "./boot.server";
import { overview } from "./overview.server";
import { currentWorkspace } from "./workspace.server";

export type WorkspaceSummary = {
	id: string;
	name: string;
	currency: string;
	plan: "free" | "indie" | "pro";
	// Hosted instance and MRR past the plan's cap: the shell shows a notice.
	overCap: boolean;
	email: string;
	products: { id: string; name: string; profit: number }[];
};

export const getWorkspace = createServerFn({ method: "GET" }).handler(
	async (): Promise<WorkspaceSummary> => {
		boot();
		const [ws, user] = await Promise.all([currentWorkspace(), requireUser()]);
		const data = await overview(ws);
		const cap = PLANS[ws.plan].mrrCapCents;
		const mrr = (data.series.mrr.at(-1) ?? 0) * 100;
		return {
			id: ws.id,
			name: ws.name,
			currency: ws.baseCurrency,
			plan: ws.plan,
			overCap: isCloud && cap !== null && mrr > cap,
			email: user.email,
			products: data.byProduct
				.filter((p) => p.id !== "shared")
				.map((p) => ({ id: p.id, name: p.name, profit: p.revenue - p.costs })),
		};
	},
);
