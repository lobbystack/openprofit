import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { definePlugin } from "nitro";
import { defineMiddleware } from "nitro/h3";
import { markdownFor } from "./markdown.server";

// The build prerenders every page that has a markdown version. Nitro lists
// its static files before those pages are written, so they are served from
// here, read and compressed once per process. `node .output/server/index.mjs`
// puts them in .output/public; anywhere else (dev, the prerender itself) the
// read fails and the page renders on the server.
const PUBLIC = join(dirname(process.argv[1] ?? ""), "../public");
type Page = { html: Buffer; gz: Buffer; br: Buffer } | null;
const pages = new Map<string, Promise<Page>>();
function prerendered(path: string) {
	let page = pages.get(path);
	if (!page) {
		page = readFile(join(PUBLIC, path, "index.html")).then(
			(html) => ({ html, gz: gzipSync(html), br: brotliCompressSync(html) }),
			() => null,
		);
		pages.set(path, page);
	}
	return page;
}

// First in line, ahead of Nitro's static files: www goes to the bare domain,
// agents asking for markdown get the page's markdown, and pages that have
// one advertise it with RFC 8288 Link headers.
const edge = defineMiddleware(async (event) => {
	const { req, url } = event;
	if (url.hostname.startsWith("www.")) {
		const to = new URL(url);
		to.hostname = to.hostname.slice(4);
		to.protocol = "https:";
		return Response.redirect(to.toString(), 301);
	}
	if (req.method !== "GET" && req.method !== "HEAD") return;
	// Only known pages have markdown, so the path is safe to read from disk.
	const md = markdownFor(url.pathname);
	if (!md) return;
	if (/text\/markdown/.test(req.headers.get("accept") ?? "")) {
		return new Response(md, {
			headers: {
				"Content-Type": "text/markdown; charset=utf-8",
				"x-markdown-tokens": String(Math.ceil(md.length / 4)),
				Vary: "Accept",
			},
		});
	}
	const link = `<${url.pathname}>; rel="alternate"; type="text/markdown", </docs/self-host>; rel="service-doc"`;
	const page = await prerendered(url.pathname.replace(/\/+$/, ""));
	if (!page) {
		event.res.headers.append("Link", link);
		event.res.headers.append("Vary", "Accept");
		return;
	}
	const enc = req.headers.get("accept-encoding") ?? "";
	const [body, encoding] = /\bbr\b/.test(enc)
		? [page.br, "br"]
		: /\bgzip\b/.test(enc)
			? [page.gz, "gzip"]
			: [page.html, null];
	const headers = new Headers({
		"Content-Type": "text/html; charset=utf-8",
		Link: link,
		Vary: "Accept, Accept-Encoding",
	});
	if (encoding) headers.set("Content-Encoding", encoding);
	return new Response(req.method === "HEAD" ? null : new Uint8Array(body), {
		headers,
	});
});

// ponytail: "~middleware" is h3's internal list (Nitro fills it the same way);
// recheck after Nitro upgrades.
export default definePlugin((app) => {
	app.h3?.["~middleware"].unshift(edge);
});
