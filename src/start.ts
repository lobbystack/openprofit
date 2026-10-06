import { isNotFound, isRedirect } from "@tanstack/react-router";
import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from "@tanstack/react-start";

// www goes to the bare domain; agents asking for markdown get the page's
// markdown; HTML pages advertise it with Link headers; text responses are
// gzipped (the host only compresses static assets). Signed-in pages and
// server function results are never cached. With POSTHOG_KEY set, each
// request is a trace span.
const edge = createMiddleware({ type: "request" }).server(
	async ({ request, next, handlerType }) => {
		const url = new URL(request.url);
		if (url.hostname.startsWith("www.")) {
			url.hostname = url.hostname.slice(4);
			url.protocol = "https:";
			return Response.redirect(url.toString(), 301);
		}

		const { markdownFor } = await import("./server/markdown.server");
		const md = markdownFor(url.pathname);
		const wantsMd = /text\/markdown/.test(request.headers.get("accept") ?? "");
		if (md && wantsMd && request.method === "GET") {
			return new Response(md, {
				headers: {
					"Content-Type": "text/markdown; charset=utf-8",
					"x-markdown-tokens": String(Math.ceil(md.length / 4)),
					Vary: "Accept",
				},
			});
		}

		const o = await import("./server/observability.server");
		const route = o.routePattern(url.pathname);
		const result = url.pathname.startsWith("/ingest/")
			? await next()
			: await o.traced(
					`${request.method} ${route}`,
					{ "http.request.method": request.method, "http.route": route },
					async (span) => {
						const r = await next();
						span.setAttribute("http.response.status_code", r.response.status);
						// Unknown paths (mostly probes) share one name.
						if (r.response.status === 404)
							span.updateName(`${request.method} not found`);
						return r;
					},
					o.SpanKind.SERVER,
				);
		const res = result.response;
		const noStore =
			handlerType === "serverFn" ||
			/^\/(app|onboarding)(\/|$)/.test(url.pathname);
		// Start turns a redirect thrown by a server function into its RPC
		// response after this middleware, so the redirect object must pass
		// through as is; a copy reaches the browser as a bare 307.
		if (isRedirect(res)) {
			if (noStore) res.headers.set("Cache-Control", "no-store");
			return result;
		}
		const type = res.headers.get("content-type") ?? "";
		const headers = new Headers(res.headers);
		if (noStore) headers.set("Cache-Control", "no-store");

		// RFC 8288 links: the markdown version and the docs.
		if (type.includes("text/html")) {
			const links = ['</docs/self-host>; rel="service-doc"'];
			if (md)
				links.unshift(
					`<${url.pathname}>; rel="alternate"; type="text/markdown"`,
				);
			headers.append("Link", links.join(", "));
			headers.append("Vary", "Accept");
		}

		const gzip =
			res.body &&
			!res.headers.has("content-encoding") &&
			/text\/html|application\/(json|xml)|text\/plain/.test(type) &&
			(request.headers.get("accept-encoding") ?? "").includes("gzip");
		if (!gzip) {
			return {
				...result,
				response: new Response(res.body, {
					status: res.status,
					statusText: res.statusText,
					headers,
				}),
			};
		}
		// Buffered: pages are small, and piping the streamed body loses it.
		const raw = await res.arrayBuffer();
		const gz = await new Response(
			new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip")),
		).arrayBuffer();
		headers.set("content-encoding", "gzip");
		headers.set("content-length", String(gz.byteLength));
		headers.append("Vary", "Accept-Encoding");
		return {
			...result,
			response: new Response(gz, {
				status: res.status,
				statusText: res.statusText,
				headers,
			}),
		};
	},
);

// Server functions only answer same-origin browser requests. Browsers send
// Sec-Fetch-Site, which is checked first. The Origin/Referer fallback also
// accepts APP_URL's origin: behind the host's proxy the request URL is http
// while the browser's origin is https.
const csrf = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
	origin: (origin, ctx) =>
		origin === new URL(ctx.request.url).origin ||
		(!!process.env.APP_URL && origin === new URL(process.env.APP_URL).origin),
});

// Server function errors go to PostHog error tracking. Redirects and
// not-found are control flow, not errors; reportError also skips provider
// and validation errors.
const errors = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		try {
			return await next();
		} catch (err) {
			if (!isRedirect(err) && !isNotFound(err)) {
				const { reportError } = await import("./server/observability.server");
				reportError(err);
			}
			throw err;
		}
	},
);

export const startInstance = createStart(() => ({
	requestMiddleware: [edge, csrf],
	functionMiddleware: [errors],
}));
