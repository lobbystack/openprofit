import { createServerFn } from "@tanstack/react-start";
import { overview } from "./overview.server";
import { currentWorkspace } from "./workspace.server";

export type WorkspaceSummary = {
	id: string;
	name: string;
	currency: string;
	plan: "free" | "indie" | "pro";
	products: { id: string; name: string; profit: number }[];
};

export const getWorkspace = createServerFn({ method: "GET" }).handler(
	async (): Promise<WorkspaceSummary> => {
		const ws = await currentWorkspace();
		const data = await overview(ws, 1);
		return {
			id: ws.id,
			name: ws.name,
			currency: ws.baseCurrency,
			plan: ws.plan,
			products: data.byProduct
				.filter((p) => p.id !== "shared")
				.map((p) => ({ id: p.id, name: p.name, profit: p.revenue - p.costs })),
		};
	},
);
