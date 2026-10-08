import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { db, schema } from "#/db";
import type { FlatCostInput } from "#/lib/costs";
import { convert } from "./fx.server";
import type { Workspace } from "./workspace.server";

// The values to store, with the amount in the base currency at today's rate.
// ponytail: every month of a flat cost uses this one rate, and saving the
// cost reprices its past months; convert per month from fx_rates at read
// time if foreign-currency flat costs need exact history.
export async function flatValues(
	ws: Workspace,
	f: z.infer<typeof FlatCostInput>,
) {
	if (f.productId) {
		const product = await db.query.products.findFirst({
			where: and(
				eq(schema.products.id, f.productId),
				eq(schema.products.workspaceId, ws.id),
			),
		});
		if (!product) throw new Error("That product no longer exists.");
	}
	const today = new Date().toISOString().slice(0, 10);
	const amountBaseCents = await convert(
		f.amountCents,
		f.currency,
		ws.baseCurrency,
		today,
	).catch(() => {
		throw new Error(
			`Couldn't get today's ${f.currency} to ${ws.baseCurrency} rate. Try again in a minute.`,
		);
	});
	return {
		name: f.name,
		amountCents: f.amountCents,
		amountBaseCents,
		currency: f.currency,
		interval: f.interval,
		startsOn: f.startsOn,
		// A one-time cost has its one date.
		endsOn: f.interval === "once" ? null : f.endsOn,
		productId: f.productId,
		// Left out (undefined), these keep their stored value.
		category: f.category,
		paidWith: f.paidWith,
		paidWithSince: f.interval === "once" ? null : f.paidWithSince,
	};
}
