import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	// PGlite docs: keep it out of Vite's dependency pre-bundling.
	optimizeDeps: { exclude: ["@electric-sql/pglite"] },
	plugins: [
		devtools(),
		nitro({
			// PGlite ships wasm and data files next to its JS; bundling drops them.
			rollupConfig: { external: [/^@sentry\//, /^@electric-sql\/pglite/] },
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
