import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Control, PageHeader } from "#/components/app/shell";
import { AreaChart } from "#/components/dashboard/area-chart";
import { money } from "#/lib/format";
import { getOverview } from "#/server/overview.functions";

export const Route = createFileRoute("/app/products")({
	loader: () => getOverview(),
	component: Products,
});

const TH = "label-mono h-9 px-4 font-normal";

function Products() {
	const data = Route.useLoaderData();
	const fmt = (n: number) => money(n, { currency: data.currency });
	const totalRevenue = data.byProduct.reduce((a, p) => a + p.revenue, 0) || 1;
	return (
		<>
			<PageHeader title="Products" meta={`${data.byProduct.length}`}>
				<Control>
					<Plus size={13} />
					Add product
				</Control>
			</PageHeader>
			<div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
				<table className="w-full text-[13px]">
					<thead>
						<tr className="border-b border-line text-left">
							<th className={TH}>Product</th>
							<th className={`${TH} text-right`}>Revenue</th>
							<th className={`${TH} text-right`}>Costs</th>
							<th className={`${TH} text-right`}>Profit</th>
							<th className={`${TH} text-right`}>Margin</th>
							<th className="h-9 w-40 px-4" />
						</tr>
					</thead>
					<tbody className="divide-y divide-line">
						{data.byProduct.map((p) => {
							const profit = p.revenue - p.costs;
							const share = p.revenue / totalRevenue;
							const series = data.series.profit.map((v) =>
								Math.round(v * share),
							);
							return (
								<tr key={p.id} className="hover:bg-surface-1">
									<td className="h-12 px-4">{p.name}</td>
									<td className="num px-4 text-right">{fmt(p.revenue)}</td>
									<td className="num px-4 text-right text-negative">
										{fmt(p.costs)}
									</td>
									<td className="num px-4 text-right">{fmt(profit)}</td>
									<td className="num px-4 text-right text-text-2">
										{p.revenue
											? `${Math.round((profit / p.revenue) * 100)}%`
											: ""}
									</td>
									<td className="px-4 py-2">
										{p.revenue > 0 && (
											<AreaChart
												data={series}
												height={28}
												tone="positive"
												compact
											/>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</>
	);
}
