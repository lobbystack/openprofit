import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { demoWorkspace } from "./demo.server";
import { taxReport } from "./tax.server";
import { currentWorkspace } from "./workspace.server";

// The yearly tax report (docs/BOOKS.md). `demo` reads the public demo
// workspace instead of the user's.
export const getTaxReport = createServerFn({ method: "GET" })
	.validator(
		z.object({
			year: z.number().int().min(2000).max(2100),
			demo: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }) =>
		taxReport(
			data.demo ? await demoWorkspace() : await currentWorkspace(),
			data.year,
		),
	);
