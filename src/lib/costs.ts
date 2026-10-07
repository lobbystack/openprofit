import { z } from "zod";
import { CURRENCIES } from "./format";

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// A flat cost as the Costs page and the MCP server send it.
export const FlatCostInput = z
	.object({
		name: z.string().trim().min(1).max(80),
		amountCents: z.number().int().positive().max(100_000_000),
		currency: z.enum(CURRENCIES),
		interval: z.enum(["month", "year"]),
		startsOn: Day,
		endsOn: Day.nullable(),
		productId: z.string().nullable(),
	})
	.refine((f) => !f.endsOn || f.endsOn >= f.startsOn, {
		message: "The end date is before the start date.",
	});
