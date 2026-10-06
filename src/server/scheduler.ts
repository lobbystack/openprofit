import "@tanstack/react-start/server-only";
import { Cron } from "croner";
import { identifyWorkspaces } from "./analytics.server";
import { isCloud } from "./billing.server";
import { syncDue } from "./sync.server";
import { sendTelemetry } from "./telemetry.server";
import { sendWeeklyEmails } from "./weekly.server";

// In-process scheduler. Runs once per process; survives Vite reloads.
declare global {
	var __openprofitScheduler:
		| { sync: Cron; weekly: Cron; telemetry: Cron }
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
		// Workspace counts for PostHog's workspace groups.
		if (isCloud)
			void identifyWorkspaces().catch((e) =>
				console.error("[scheduler] workspace groups", e),
			);
	});
	globalThis.__openprofitScheduler = { sync, weekly, telemetry };
	return globalThis.__openprofitScheduler;
}
