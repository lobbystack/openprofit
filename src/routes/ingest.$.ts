import { createFileRoute } from "@tanstack/react-router";

// Reverse proxy for PostHog, so blockers that drop requests to posthog.com
// let the browser's events through. /ingest/static and /ingest/array go to
// the assets host, everything else to the ingestion host.
async function proxy({ request }: { request: Request }) {
	if (!process.env.POSTHOG_KEY) return new Response(null, { status: 404 });
	const api = new URL(process.env.POSTHOG_HOST ?? "https://us.i.posthog.com");
	const url = new URL(request.url);
	const path = url.pathname.replace(/^\/ingest/, "");
	// Only paths on the PostHog host: "//evil.com/x" would resolve to another
	// host if joined as a URL.
	if (!/^\/(?!\/)/.test(path) || path.includes("\\"))
		return new Response(null, { status: 400 });
	const target = new URL(api);
	target.pathname = path;
	target.search = url.search;
	if (/^\/(static|array)\//.test(path))
		target.hostname = api.hostname.replace(/^(\w+)\.i\./, "$1-assets.i.");

	const headers = new Headers(request.headers);
	for (const h of [
		"host",
		"cookie",
		"authorization",
		"connection",
		"content-length",
		"accept-encoding",
	])
		headers.delete(h);
	const res = await fetch(target, {
		method: request.method,
		headers,
		body: request.method === "POST" ? await request.arrayBuffer() : undefined,
	});
	// fetch already decoded the body.
	const out = new Headers(res.headers);
	out.delete("content-encoding");
	out.delete("content-length");
	return new Response(res.body, { status: res.status, headers: out });
}

export const Route = createFileRoute("/ingest/$")({
	server: { handlers: { GET: proxy, POST: proxy, OPTIONS: proxy } },
});
