import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import medium from "#/assets/fonts/Geist-Medium.ttf?inline";
import regular from "#/assets/fonts/Geist-Regular.ttf?inline";
import { APP_NAME } from "#/lib/app";
import type { PublicNumbers } from "./public.server";

// Badge and social image for a public product page. Both show only what the
// page's mode shows.

const INK = "#26251e";
const PAPER = "#f7f7f4";
const SURFACE = "#ebeae5";
const FONT =
	"Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

// Geist Regular advance widths in em, read from the font's hmtx table, so
// the badge can size itself. Other characters count as 0.6em.
// biome-ignore format: a table reads better packed
const EM: Record<string, number> = {
	" ": 0.25, "$": 0.629, "%": 0.802, "+": 0.558, ",": 0.201, "-": 0.419,
	".": 0.201, "/": 0.48, "0": 0.663, "1": 0.384, "2": 0.619, "3": 0.613,
	"4": 0.615, "5": 0.626, "6": 0.593, "7": 0.524, "8": 0.604, "9": 0.593,
	A: 0.668, B: 0.68, C: 0.703, F: 0.59, H: 0.713, K: 0.64, M: 0.877,
	O: 0.739, P: 0.65, T: 0.552, a: 0.551, b: 0.595, c: 0.546, d: 0.595,
	e: 0.561, f: 0.395, g: 0.594, h: 0.581, i: 0.244, j: 0.26, k: 0.59,
	l: 0.267, m: 0.877, n: 0.581, o: 0.573, p: 0.595, q: 0.595, r: 0.379,
	s: 0.52, t: 0.392, u: 0.575, v: 0.536, w: 0.819, x: 0.585, y: 0.537,
	z: 0.537, "·": 0.201, "€": 0.727, "£": 0.611, "−": 0.52, "–": 0.5,
};
const width = (s: string, size: number) =>
	[...s].reduce((a, ch) => a + (EM[ch] ?? 0.6), 0) * size;

const esc = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			] as string,
	);

// Cut a string to fit a width, with an ellipsis.
function fit(s: string, size: number, max: number) {
	if (width(s, size) <= max) return s;
	let out = s;
	while (out.length > 1 && width(`${out}…`, size) > max) out = out.slice(0, -1);
	return `${out.trimEnd()}…`;
}

const compact = (n: number, currency: string) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(n);
const signed = (n: number) =>
	`${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(Math.round(n))}%`;

// The badge's right half, by page mode.
function badgeText(n: PublicNumbers) {
	const parts: string[] = [];
	if (n.revenue !== null)
		parts.push(`${compact(n.revenue, n.currency)}/mo revenue`);
	if (n.margin !== null) parts.push(`${Math.round(n.margin)}% margin`);
	if (n.mode === "percent" && n.growth !== null)
		parts.push(`${signed(n.growth)} growth`);
	return parts.join(" · ") || "No revenue yet";
}

export function badgeSvg(n: PublicNumbers) {
	const size = 11;
	const pad = 7;
	const check = n.verified ? 13 : 0;
	const text = badgeText(n);
	const lw = Math.ceil(width(APP_NAME, size) + pad * 2 + check);
	const rw = Math.ceil(width(text, size) + pad * 2);
	const w = lw + rw;
	const label = `${n.product} on ${APP_NAME}${n.verified ? ", verified" : ""}: ${text}`;
	// textLength pins each run to the measured width whatever font the
	// viewer falls back to.
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" viewBox="0 0 ${w} 20" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<clipPath id="r"><rect width="${w}" height="20" rx="4"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="${INK}"/><rect x="${lw}" width="${rw}" height="20" fill="${SURFACE}"/></g>
<g font-family="${FONT}" font-size="${size}">
<text x="${pad}" y="14" fill="${PAPER}" font-weight="500" textLength="${width(APP_NAME, size).toFixed(1)}">${APP_NAME}</text>
${n.verified ? `<path d="M${lw - pad - 9} 10.2l2.3 2.3 4.4-4.6" fill="none" stroke="${PAPER}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
<text x="${lw + pad}" y="14" fill="${INK}" textLength="${width(text, size).toFixed(1)}">${esc(text)}</text>
</g>
</svg>`;
}

// 1200x630 social image: product, workspace, the numbers the mode allows.
export function ogSvg(n: PublicNumbers) {
	const money = (v: number) => compact(v, n.currency);
	const tiles: [string, string][] = [];
	if (n.revenue !== null) tiles.push(["Revenue", money(n.revenue)]);
	if (n.costs !== null) tiles.push(["Costs", money(n.costs)]);
	if (n.profit !== null) tiles.push(["Profit", money(n.profit)]);
	if (n.mode === "percent" && n.growth !== null)
		tiles.push(["Revenue growth", signed(n.growth)]);
	if (n.margin !== null) tiles.push(["Margin", `${Math.round(n.margin)}%`]);
	const col = 1040 / Math.max(tiles.length, 1);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${PAPER}"/>
<g font-family="Geist" fill="${INK}">
<text x="80" y="160" font-size="72">${esc(fit(n.product, 72, 1040))}</text>
<text x="80" y="218" font-size="32" fill-opacity="0.6">${esc(fit(n.workspace, 32, 1040))}</text>
<text x="80" y="340" font-size="24" fill-opacity="0.6">Last 30 days</text>
${tiles
	.map(
		([label, value], i) =>
			`<text x="${80 + i * col}" y="392" font-size="24" fill-opacity="0.6">${label}</text><text x="${80 + i * col}" y="456" font-size="56">${esc(value)}</text>`,
	)
	.join("\n")}
<rect x="80" y="528" width="1040" height="1" fill-opacity="0.1"/>
<text x="80" y="584" font-size="28" font-weight="500" letter-spacing="-0.56">${APP_NAME}</text>
${n.verified ? `<text x="1120" y="584" font-size="24" fill-opacity="0.6" text-anchor="end">Verified from provider APIs</text>` : ""}
</g>
</svg>`;
}

let wasm: Promise<void> | undefined;
// Vite's `?inline` imports are base64 data URIs, so the fonts ship inside
// the server bundle (vite.dev/guide/assets#explicit-inline-handling).
const fonts = [regular, medium].map((uri) =>
	Buffer.from(uri.slice(uri.indexOf(",") + 1), "base64"),
);

export async function ogPng(n: PublicNumbers) {
	// initWasm takes the module bytes once per process; fonts come from
	// fontBuffers, not the system (github.com/thx/resvg-js/tree/main/wasm).
	wasm ??= readFile(
		createRequire(import.meta.url).resolve("@resvg/resvg-wasm/index_bg.wasm"),
	).then(initWasm);
	await wasm;
	const r = new Resvg(ogSvg(n), {
		font: { fontBuffers: fonts, defaultFontFamily: "Geist" },
	});
	const png = new Uint8Array(r.render().asPng());
	r.free();
	return png;
}
