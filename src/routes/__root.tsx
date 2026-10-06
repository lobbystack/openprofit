import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Consent } from "../components/consent";
import { APP_NAME, SITE_DESCRIPTION, SITE_URL } from "../lib/app";
import { THEME_SCRIPT } from "../lib/theme";
import { getAnalyticsConfig } from "../server/analytics.functions";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: APP_NAME },
			{ name: "description", content: SITE_DESCRIPTION },
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: APP_NAME },
			{ property: "og:image", content: `${SITE_URL}/og.png` },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:image", content: `${SITE_URL}/og.png` },
			{ name: "theme-color", content: "#f7f7f4" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			// ?v= changes the URL so browsers that cache icons (Safari) refetch
			// after the mark changes. Bump it with every new icon.
			{ rel: "icon", href: "/favicon.ico?v=2", sizes: "32x32" },
			{ rel: "icon", href: "/favicon.svg?v=2", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=2" },
		],
		scripts: [{ children: THEME_SCRIPT }],
	}),
	// PostHog settings and the saved cookie choice, read during SSR so the
	// banner renders without a flash.
	loader: () => getAnalyticsConfig(),
	staleTime: Number.POSITIVE_INFINITY,
	component: Root,
	shellComponent: RootDocument,
});

function Root() {
	return (
		<>
			<Outlet />
			<Consent />
		</>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				{import.meta.env.DEV && (
					<TanStackDevtools
						config={{ position: "bottom-right" }}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
