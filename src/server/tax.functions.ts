import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { taxReport } from "./tax.server";
import { currentWorkspace } from "./workspace.server";

// The yearly tax report (docs/BOOKS.md).
export const getTaxReport = createServerFn({ method: "GET" })
	.validator(z.object({ year: z.number().int().min(2000).max(2100) }))
	.handler(async ({ data }) => taxReport(await currentWorkspace(), data.year));
