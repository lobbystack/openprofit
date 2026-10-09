import { z } from "zod";
import { CURRENCIES } from "./format";

// A calendar date, YYYY-MM-DD. Rejects days that don't exist (2026-02-31).
export const Day = z.iso.date();

// A flat cost as the Costs page and the MCP server send it.
export const FlatCostInput = z
	.object({
		name: z.string().trim().min(1).max(80),
		amountCents: z.number().int().positive().max(100_000_000),
		currency: z.enum(CURRENCIES),
		interval: z.enum(["month", "year", "once"]),
		startsOn: Day,
		endsOn: Day.nullable(),
		productId: z.string().nullable(),
		// Books (docs/BOOKS.md). Optional so older callers keep working.
		category: z
			.enum([
				"ai_apis",
				"hosting",
				"email",
				"software",
				"contractors",
				"other",
				"equipment",
			])
			.nullable()
			.optional(),
		paidWith: z.enum(["personal", "company"]).optional(),
		paidWithSince: Day.nullable().optional(),
	})
	.refine((f) => !f.endsOn || f.endsOn >= f.startsOn, {
		message: "The end date is before the start date.",
	});
