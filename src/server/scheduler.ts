import { Cron } from "croner";
import { syncDue } from "./sync.server";

// In-process scheduler. Runs once per process; survives Vite reloads.
declare global {
	var __pnlScheduler: Cron | undefined;
}

export function startScheduler() {
	if (globalThis.__pnlScheduler) return globalThis.__pnlScheduler;
	const job = new Cron("*/5 * * * *", { protect: true }, async () => {
		const n = await syncDue();
		if (n) console.log(`[sync] ${n} connection(s) synced`);
	});
	globalThis.__pnlScheduler = job;
	return job;
}
