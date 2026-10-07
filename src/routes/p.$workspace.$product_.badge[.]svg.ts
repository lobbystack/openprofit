import { createFileRoute } from "@tanstack/react-router";

// Embeddable badge for a public product page. Under `pnpm dev`, Nitro treats
// image requests for .svg and .png paths as static files and answers 404
// (nitro/dist/_build/vite.dev.mjs); production serves them. To test in dev:
// curl -H "Sec-Fetch-Dest: document" <url>.
export const Route = createFileRoute("/p/$workspace/$product_/badge.svg")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				// Imported here so the prerender never opens the database.
				const { findPublic, publicNumbers } = await import(
					"#/server/public.server"
				);
				const { badgeSvg } = await import("#/server/images.server");
				const found = await findPublic(params.workspace, params.product);
				if (!found) return new Response("Not found", { status: 404 });
				return new Response(badgeSvg(await publicNumbers(found)), {
					headers: {
						"Content-Type": "image/svg+xml; charset=utf-8",
						// Live numbers: image proxies and the host's edge keep a copy
						// for five minutes at most.
						"Cache-Control": "public, max-age=300, s-maxage=300",
					},
				});
			},
		},
	},
});
