import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth.server";
import { createWorkspace } from "./workspace.server";

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF"] as const;

const Input = z.object({
	name: z.string().trim().min(1).max(60),
	currency: z.enum(CURRENCIES),
});

export const createWorkspaceFn = createServerFn({ method: "POST" })
	.inputValidator(Input)
	.handler(async ({ data }) => {
		const user = await requireUser();
		const ws = await createWorkspace(user.id, data);
		return { id: ws.id };
	});
