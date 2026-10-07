import { createFileRoute } from "@tanstack/react-router";
import { ConnectionItem } from "#/components/app/connection-item";
import { PageHeader } from "#/components/app/shell";
import { Card } from "#/components/ui/card";
import { getConnections } from "#/server/connections.functions";

export const Route = createFileRoute("/demo/connections")({
	head: () => ({ meta: [{ title: "Connections · OpenProfit demo" }] }),
	loader: () => getConnections({ data: { demo: true } }),
	component: DemoConnections,
});

function DemoConnections() {
	const rows = Route.useLoaderData();
	return (
		<>
			<PageHeader title="Connections" meta={`${rows.length}`} />
			<Card className="mt-4 overflow-hidden">
				<ul className="divide-y divide-line">
					{rows.map((r) => (
						<ConnectionItem key={r.id} row={r} />
					))}
				</ul>
			</Card>
		</>
	);
}
