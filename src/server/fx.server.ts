import { and, eq } from "drizzle-orm";
import { db, schema } from "#/db";

// Daily ECB reference rates through Frankfurter. Cached per (date, base).
export async function convert(
	cents: number,
	from: string,
	to: string,
	date: string,
) {
	if (from === to || cents === 0) return cents;
	const rate = await rateFor(date, from, to);
	return Math.round(cents * rate);
}

async function rateFor(
	date: string,
	from: string,
	to: string,
): Promise<number> {
	const cached = await db.query.fxRates.findFirst({
		where: and(
			eq(schema.fxRates.date, date),
			eq(schema.fxRates.base, from),
			eq(schema.fxRates.currency, to),
		),
	});
	if (cached) return cached.rate;
	const res = await fetch(
		`https://api.frankfurter.dev/v1/${date}?base=${from}&symbols=${to}`,
	);
	if (!res.ok) throw new Error(`FX ${from}->${to} ${date}: ${res.status}`);
	const json = (await res.json()) as { rates: Record<string, number> };
	const rate = json.rates[to];
	if (!rate) throw new Error(`FX ${from}->${to} ${date}: no rate`);
	await db
		.insert(schema.fxRates)
		.values({ date, base: from, currency: to, rate })
		.onConflictDoNothing();
	return rate;
}
