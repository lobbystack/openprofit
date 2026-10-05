import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Shell } from "#/components/app/shell";
import { getWorkspace } from "#/server/workspace.functions";

export const Route = createFileRoute("/app")({
	loader: () => getWorkspace(),
	component: AppLayout,
});

function AppLayout() {
	const workspace = Route.useLoaderData();
	return (
		<Shell workspace={workspace}>
			<Outlet />
		</Shell>
	);
}
