import { createMiddleware, createStart } from "@tanstack/react-start";

// www goes to the bare domain; HTML is gzipped (the host only compresses
// static assets).
const edge = createMiddleware({ type: "request" }).server(
	async ({ request, next }) => {
		const url = new URL(request.url);
		if (url.hostname.startsWith("www.")) {
			url.hostname = url.hostname.slice(4);
			url.protocol = "https:";
			return Response.redirect(url.toString(), 301);
		}
		const result = await next();
		const res = result.response;
		const type = res.headers.get("content-type") ?? "";
		if (
			!res.body ||
			res.headers.has("content-encoding") ||
			!/text\/html|application\/(json|xml)|text\/plain/.test(type) ||
			!(request.headers.get("accept-encoding") ?? "").includes("gzip")
		)
			return result;
		// Buffered: pages are small, and piping the streamed body loses it.
		const raw = await res.arrayBuffer();
		const gz = await new Response(
			new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip")),
		).arrayBuffer();
		const headers = new Headers(res.headers);
		headers.set("content-encoding", "gzip");
		headers.set("content-length", String(gz.byteLength));
		headers.append("vary", "accept-encoding");
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

export const startInstance = createStart(() => ({
	requestMiddleware: [edge],
}));
