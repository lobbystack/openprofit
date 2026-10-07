import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { periodSchema } from "#/lib/overview";
import { demoWorkspace } from "./demo.server";
import { overview } from "./overview.server";
import { currentProduct, currentWorkspace } from "./workspace.server";

// `demo` reads the public demo workspace instead of the user's. The
// switcher's product narrows it unless `all` is set (the Products page).
export const getOverview = createServerFn({ method: "GET" })
	.validator(
		z
			.object({
				period: periodSchema,
				demo: z.boolean().optional(),
				all: z.boolean().optional(),
			})
			.default({ period: "this-month" }),
	)
	.handler(async ({ data }) => {
		if (data.demo) return overview(await demoWorkspace(), data.period);
		const ws = await currentWorkspace();
		const product = data.all ? null : await currentProduct(ws);
		return overview(ws, data.period, product?.id ?? null);
	});
