import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { periodSchema } from "#/lib/overview";
import { overview } from "./overview.server";
import { currentWorkspace } from "./workspace.server";

export const getOverview = createServerFn({ method: "GET" })
	.validator(
		z.object({ period: periodSchema }).default({ period: "this-month" }),
	)
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		return overview(ws, data.period);
	});
