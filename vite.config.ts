import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const PRERENDER =
	/^\/(|changelog|privacy|terms|cookies|security|integrations|(docs|integrations|compare)\/[\w-]+)\/?$/;

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	// PGlite docs: keep it out of Vite's dependency pre-bundling.
	optimizeDeps: { exclude: ["@electric-sql/pglite"] },
	// devtools first; tanstackStart before nitro and react.
	plugins: [
		devtools(),
		tailwindcss(),
		tanstackStart({
			// Pages that read no live data are built once to static HTML,
			// starting from the landing page and following its links. Product
			// pages, the sitemap and the app stay server-rendered.
			prerender: {
				enabled: true,
				crawlLinks: true,
				filter: ({ path }) => PRERENDER.test(path),
			},
		}),
		nitro({
			// PGlite ships wasm and data files next to its JS; bundling drops them.
			rollupConfig: { external: [/^@electric-sql\/pglite/] },
			// Scripts and styles ship as .gz and .br next to the file.
			compressPublicAssets: { gzip: true, brotli: true },
			// www, markdown, Link headers and prerendered pages, ahead of the
			// static files.
			plugins: ["./src/server/edge.server.ts"],
		}),
		viteReact(),
	],
});

export default config;
