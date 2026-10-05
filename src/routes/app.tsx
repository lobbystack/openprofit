import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Shell } from "#/components/app/shell";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
	return (
		<Shell>
			<Outlet />
		</Shell>
	);
}
