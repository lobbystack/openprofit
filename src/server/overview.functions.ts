import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { overview } from "./overview.server";
import { currentWorkspace } from "./workspace.server";

export const periodSchema = z
	.enum(["this-month", "last-month", "3m", "12m", "ytd"])
	.default("this-month");

export const getOverview = createServerFn({ method: "GET" })
	.validator(
		z.object({ period: periodSchema }).default({ period: "this-month" }),
	)
	.handler(async ({ data }) => {
		const ws = await currentWorkspace();
		return overview(ws, data.period);
	});
