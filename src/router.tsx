import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { ErrorPage, NotFound } from "./components/status-page";
import { routeTree } from "./routeTree.gen";

// TanStack reloads once when a tab opened before a deploy asks for a route
// chunk the deploy removed. Its guard key is the error message, which Safari
// leaves without the URL, so a tab only recovers from its first deploy
// (TanStack/router#8331). Clearing the key once the page has run for a while
// lets the next deploy recover too; clearing it at startup could loop if a
// chunk is missing for good.
// ponytail: drop this once that issue is fixed upstream.
if (typeof window !== "undefined")
	setTimeout(() => {
		try {
			for (const k of Object.keys(sessionStorage))
				if (k.startsWith("tanstack_router_reload:"))
					sessionStorage.removeItem(k);
		} catch {}
	}, 10_000);

export function getRouter() {
	return createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultErrorComponent: ErrorPage,
		defaultNotFoundComponent: NotFound,
	});
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
