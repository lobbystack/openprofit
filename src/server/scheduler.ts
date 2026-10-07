import "@tanstack/react-start/server-only";
import { Cron } from "croner";
import { identifyWorkspaces } from "./analytics.server";
import { pruneAgentRecords } from "./api.server";
import { computeBenchmarks } from "./benchmarks.server";
import { isCloud } from "./billing.server";
import { syncDue } from "./sync.server";
import { sendTelemetry } from "./telemetry.server";
import { sendWeeklyEmails } from "./weekly.server";

// In-process scheduler. Runs once per process; survives Vite reloads.
declare global {
	var __openprofitScheduler:
		| { sync: Cron; weekly: Cron; telemetry: Cron; benchmarks: Cron }
		| undefined;
}

export function startScheduler() {
	if (globalThis.__openprofitScheduler) return globalThis.__openprofitScheduler;
	const sync = new Cron("*/5 * * * *", { protect: true }, async () => {
		const n = await syncDue();
		if (n) console.info(`[sync] ${n} connection(s) synced`);
	});
	// Hourly: each workspace picks its own day and hour.
	const weekly = new Cron("0 * * * *", { protect: true }, async () => {
		await sendWeeklyEmails();
	});
	const telemetry = new Cron("30 3 * * *", { protect: true }, () => {
		void sendTelemetry();
		void pruneAgentRecords().catch((e) =>
			console.error("[scheduler] prune agent records", e),
		);
		// Workspace counts for PostHog's workspace groups.
		if (isCloud)
			void identifyWorkspaces().catch((e) =>
				console.error("[scheduler] workspace groups", e),
			);
	});
	// Hosted, the 3rd of each month: last month's benchmarks, once its last
	// days have synced. `pnpm benchmarks` runs it by hand.
	const benchmarks = new Cron(
		"0 5 3 * *",
		{
			protect: true,
			// croner docs (options.catch): a function receives the error.
			catch: (e) => console.error("[benchmarks]", e),
		},
		async () => {
			if (!isCloud) return;
			const r = await computeBenchmarks();
			console.info(
				`[benchmarks] ${r.month}: ${r.workspaces} workspace(s), ${r.cohorts} cohort(s)`,
			);
		},
	);
	globalThis.__openprofitScheduler = { sync, weekly, telemetry, benchmarks };
	return globalThis.__openprofitScheduler;
}
