import { Cron } from "croner";
import { syncDue } from "./sync.server";
import { sendWeeklyEmails } from "./weekly.server";

// In-process scheduler. Runs once per process; survives Vite reloads.
declare global {
	var __openprofitScheduler: { sync: Cron; weekly: Cron } | undefined;
}

export function startScheduler() {
	if (globalThis.__openprofitScheduler) return globalThis.__openprofitScheduler;
	const sync = new Cron("*/5 * * * *", { protect: true }, async () => {
		const n = await syncDue();
		if (n) console.log(`[sync] ${n} connection(s) synced`);
	});
	// Monday 09:00 in the server's timezone.
	const weekly = new Cron("0 9 * * 1", { protect: true }, async () => {
		await sendWeeklyEmails();
	});
	globalThis.__openprofitScheduler = { sync, weekly };
	return globalThis.__openprofitScheduler;
}
