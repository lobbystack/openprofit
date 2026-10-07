import { getRequestIP } from "@tanstack/react-start/server";

// The client's address, for rate limits.
// - Railway's edge sets X-Real-IP to the client's address, overwriting what
//   the client sent, and services behind it can't be reached directly:
//   https://docs.railway.com/networking/public-networking/specs-and-limits
// - TRUST_PROXY=N: the instance sits behind N reverse proxies (nginx, Caddy,
//   Traefik, a load balancer), each appending the address it saw to
//   X-Forwarded-For. The Nth entry from the end is the client; entries
//   before it came from the client and are ignored. `true` means 1.
// - Otherwise the client could send either header, so the socket counts.
const raw = process.env.TRUST_PROXY;
const hops = raw === "true" ? 1 : Math.max(0, Math.floor(Number(raw)) || 0);

export function clientIp(request: Request) {
	if (process.env.RAILWAY_ENVIRONMENT_ID) {
		const real = request.headers.get("x-real-ip");
		if (real) return real;
	}
	if (hops) {
		const chain = (request.headers.get("x-forwarded-for") ?? "")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		const ip = chain[chain.length - hops];
		if (ip) return ip;
	}
	return getRequestIP() || "unknown";
}

// Fixed-window counters. A 429 with Retry-After once `key` passes `max`
// requests in `ms`.
// ponytail: per-process and reset on restart; with more than one instance,
// move the counters to a shared store (Postgres or Redis).
const windows = new Map<string, { hits: number; resetAt: number }>();
let sweepAt = 0;
export function rateLimit(
	key: string,
	max: number,
	ms: number,
	body: object,
): Response | null {
	const now = Date.now();
	if (now > sweepAt) {
		for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
		sweepAt = now + 60_000;
	}
	let w = windows.get(key);
	if (!w || w.resetAt <= now) {
		w = { hits: 0, resetAt: now + ms };
		windows.set(key, w);
	}
	if (++w.hits <= max) return null;
	return Response.json(body, {
		status: 429,
		headers: { "Retry-After": String(Math.ceil((w.resetAt - now) / 1000)) },
	});
}
