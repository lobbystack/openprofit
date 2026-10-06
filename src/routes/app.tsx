import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { Shell } from "#/components/app/shell";
import { identify } from "#/lib/analytics";
import { NOINDEX } from "#/lib/app";
import { getWorkspace } from "#/server/workspace.functions";

export const Route = createFileRoute("/app")({
	head: () => ({
		...NOINDEX,
		meta: [{ title: "OpenProfit" }, ...NOINDEX.meta],
	}),
	loader: () => getWorkspace(),
	component: AppLayout,
});

function AppLayout() {
	const workspace = Route.useLoaderData();
	const { userId, analytics, id, plan } = workspace;
	useEffect(
		() => identify(userId, analytics, id, plan),
		[userId, analytics, id, plan],
	);
	return (
		<Shell workspace={workspace}>
			<Outlet />
		</Shell>
	);
}
