import { and, eq } from "drizzle-orm";
import { db, schema } from "#/db";

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

// Daily rates, cached per (date, base, currency) in fx_rates. Into Canadian
// dollars: Bank of Canada. Everything else: ECB reference rates through
// Frankfurter. Conversions out of CAD (plan limits and benchmarks in USD) stay
// on ECB: they compare figures, they aren't bookkeeping, and every pair other
// than X->CAD then comes from one source.
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
	if (to === "CAD") {
		const rate = await bankOfCanada(date, from);
		if (rate) return rate;
	}
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

// The CRA asks for the Bank of Canada rate for the day, or for the closest
// preceding day when none was quoted (Income Tax Folio S5-F4-C1, ¶1.4).
// Valet series FX<cur>CAD is Canadian dollars per unit of <cur>, one
// observation per business day
// (https://www.bankofcanada.ca/valet/docs, /observations/{seriesNames}/json).
// One request reads a year either side of the date and caches every day in it,
// weekends and holidays at the preceding rate, so a two-year sync makes a few
// requests. Today and later are cached only once quoted: the Bank publishes
// each afternoon, and the sync rereads the last days. Null when the Bank
// doesn't publish the currency (DKK, CZK...) or has no rate on or before the
// date; Frankfurter covers those.
async function bankOfCanada(date: string, from: string) {
	const series = `FX${from}CAD`;
	const today = iso(Date.now());
	const at = Date.parse(date);
	const start = date >= today ? at - 10 * DAY : at - 365 * DAY;
	const end = date >= today ? at : at + 365 * DAY;
	const res = await fetch(
		`https://www.bankofcanada.ca/valet/observations/${series}/json?start_date=${iso(start)}&end_date=${iso(end)}`,
	);
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`FX ${from}->CAD ${date}: ${res.status}`);
	const { observations } = (await res.json()) as {
		observations: { d: string; [series: string]: { v?: string } | string }[];
	};
	const quoted = new Map<string, number>();
	for (const o of observations) {
		const cell = o[series];
		const v = typeof cell === "object" ? Number(cell.v) : 0;
		if (v > 0) quoted.set(o.d, v);
	}
	const rows: (typeof schema.fxRates.$inferInsert)[] = [];
	let last: number | undefined;
	let rate: number | undefined;
	for (let t = start; t <= end; t += DAY) {
		const d = iso(t);
		last = quoted.get(d) ?? last;
		if (d === date) rate = last;
		if (last && (quoted.has(d) || d < today))
			rows.push({ date: d, base: from, currency: "CAD", rate: last });
	}
	if (rows.length)
		await db.insert(schema.fxRates).values(rows).onConflictDoNothing();
	return rate ?? null;
}
