import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Shell } from "#/components/app/shell";
import { seo } from "#/lib/app";
import { getDemoWorkspace } from "#/server/workspace.functions";

// The public read-only demo: the app's pages over the demo workspace, no
// sign-in. Indexed, as a page people can try before signing up.
export const Route = createFileRoute("/demo")({
	head: () =>
		seo({
			title: "OpenProfit demo: profit per product with sample data",
			description:
				"Try OpenProfit without signing up. It shows three sample products, with revenue from Stripe and costs from OpenAI, Anthropic, Vercel, Resend and Firecrawl.",
			path: "/demo",
		}),
	loader: () => getDemoWorkspace(),
	component: DemoLayout,
});

function DemoLayout() {
	return (
		<Shell workspace={Route.useLoaderData()} demo>
			<Outlet />
		</Shell>
	);
}
