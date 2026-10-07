// Computes the benchmark percentiles for one month, by default the last
// complete one: `pnpm benchmarks` or `pnpm benchmarks --month=2026-09`.
// With PGlite, stop the dev server first.
import assert from "node:assert/strict";
import { bandFor, percentile } from "#/lib/benchmarks";
import { computeBenchmarks } from "#/server/benchmarks.server";

// The math the dataset rests on: numpy's default percentiles, band edges.
assert.equal(percentile([1, 2, 3, 4], 0.25), 1.75);
assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
assert.equal(percentile([7], 0.9), 7);
assert.equal(bandFor(99_999), "0-1k");
assert.equal(bandFor(100_000), "1k-5k");
assert.equal(bandFor(2_000_000), "20k+");

const month = process.argv.find((a) => a.startsWith("--month="))?.slice(8);
if (month && !/^\d{4}-\d{2}$/.test(month)) throw new Error("--month=YYYY-MM");
const r = await computeBenchmarks(month);
console.log(
	`${r.month}: ${r.workspaces} workspace(s) qualify, ${r.cohorts} cohort(s) written`,
);
process.exit(0);
