import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentWorkspace } from "./workspace.server";

// The yearly tax report (docs/BOOKS.md). Stub: the tax work fills this in.
export const getTaxReport = createServerFn({ method: "GET" })
	.validator(z.object({ year: z.number().int() }))
	.handler(async ({ data }) => {
		await currentWorkspace();
		return { year: data.year };
	});
