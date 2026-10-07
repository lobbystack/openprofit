import { createFileRoute } from "@tanstack/react-router";
import { ProductsTable } from "#/components/app/products-table";
import { PageHeader } from "#/components/app/shell";
import { getOverview } from "#/server/overview.functions";

export const Route = createFileRoute("/demo/products")({
	head: () => ({ meta: [{ title: "Products · OpenProfit demo" }] }),
	loader: () => getOverview({ data: { period: "this-month", demo: true } }),
	component: DemoProducts,
});

function DemoProducts() {
	const data = Route.useLoaderData();
	const count = data.byProduct.filter((p) => p.id !== "unassigned").length;
	return (
		<>
			<PageHeader title="Products" meta={`${count}`} />
			<ProductsTable data={data} />
		</>
	);
}
