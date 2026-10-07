import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ConnectForm } from "#/components/app/connect-form";
import { PageHeader } from "#/components/app/shell";
import {
	createConnection,
	getConnectorInfo,
	testConnection,
} from "#/server/connections.functions";

export const Route = createFileRoute("/app/connect/$provider")({
	head: () => ({ meta: [{ title: "Connect · OpenProfit" }] }),
	loader: ({ params }) => getConnectorInfo({ data: { id: params.provider } }),
	component: Connect,
});

function Connect() {
	const info = Route.useLoaderData();
	const navigate = useNavigate();
	const testFn = useServerFn(testConnection);
	const createFn = useServerFn(createConnection);

	return (
		<>
			<PageHeader
				title={info.name}
				meta={info.kind === "revenue" ? "Revenue" : "Costs"}
			/>
			<ConnectForm
				info={info}
				test={(credentials) =>
					testFn({ data: { provider: info.id, credentials } })
				}
				save={async (credentials) => {
					await createFn({ data: { provider: info.id, credentials } });
					await navigate({ to: "/app/connections" });
				}}
			/>
			<Link
				to="/app/connections"
				className="mt-4 inline-block text-[13px] text-text-2 hover:text-ink"
			>
				All connections
			</Link>
		</>
	);
}
