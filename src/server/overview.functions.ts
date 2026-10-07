import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { periodSchema } from "#/lib/overview";
import { demoWorkspace } from "./demo.server";
import { overview } from "./overview.server";
import { currentWorkspace } from "./workspace.server";

// `demo` reads the public demo workspace instead of the user's.
export const getOverview = createServerFn({ method: "GET" })
	.validator(
		z
			.object({ period: periodSchema, demo: z.boolean().optional() })
			.default({ period: "this-month" }),
	)
	.handler(async ({ data }) => {
		const ws = data.demo ? await demoWorkspace() : await currentWorkspace();
		return overview(ws, data.period);
	});
