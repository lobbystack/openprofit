import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

// After a deploy, a tab opened before it asks for code chunks that no longer
// exist. Reload once to load the new build instead of showing an error.
if (typeof window !== "undefined")
	window.addEventListener("vite:preloadError", (e) => {
		try {
			const last = Number(sessionStorage.getItem("op_reload") ?? 0);
			if (Date.now() - last < 10_000) return;
			sessionStorage.setItem("op_reload", String(Date.now()));
		} catch {}
		e.preventDefault();
		location.reload();
	});

export function getRouter() {
	const context = getContext();

	const router = createTanStackRouter({
		routeTree,
		context,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
