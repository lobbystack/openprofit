import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createMiddleware, createStart } from "@tanstack/react-start";

// www goes to the bare domain; agents asking for markdown get the page's
// markdown; HTML pages advertise it with Link headers; text responses are
// gzipped (the host only compresses static assets). With POSTHOG_KEY set,
// each request is a trace span.
const edge = createMiddleware({ type: "request" }).server(
	async ({ request, next }) => {
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
		const result = url.pathname.startsWith("/ingest/")
			? await next()
			: await o.traced(
					`${request.method} ${url.pathname}`,
					{ "http.request.method": request.method, "url.path": url.pathname },
					async (span) => {
						const r = await next();
						span.setAttribute("http.response.status_code", r.response.status);
						return r;
					},
					o.SpanKind.SERVER,
				);
		const res = result.response;
		const type = res.headers.get("content-type") ?? "";
		const headers = new Headers(res.headers);

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

// Server function errors go to PostHog error tracking. Redirects and
// not-found are control flow, not errors.
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
	requestMiddleware: [edge],
	functionMiddleware: [errors],
}));
