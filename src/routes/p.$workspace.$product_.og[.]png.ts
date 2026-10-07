import { createFileRoute } from "@tanstack/react-router";

// Social image for a public product page. PNG: X and LinkedIn skip SVG.
export const Route = createFileRoute("/p/$workspace/$product_/og.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { findPublic, publicNumbers } = await import(
					"#/server/public.server"
				);
				const { ogPng } = await import("#/server/images.server");
				const found = await findPublic(params.workspace, params.product);
				if (!found) return new Response("Not found", { status: 404 });
				return new Response(await ogPng(await publicNumbers(found)), {
					headers: {
						"Content-Type": "image/png",
						"Cache-Control": "public, max-age=3600, s-maxage=3600",
					},
				});
			},
		},
	},
});
