import { startScheduler } from "./scheduler";

// Runs once per server process, on the first app request.
let booted = false;
export function boot() {
	if (booted) return;
	booted = true;
	if (process.env.SYNC_SCHEDULER !== "off") startScheduler();
}
