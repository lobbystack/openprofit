import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Control, PageHeader } from "#/components/app/shell";
import { AreaChart } from "#/components/dashboard/area-chart";
import { money, PRODUCTS, SERIES } from "#/components/dashboard/mock-data";

export const Route = createFileRoute("/app/products")({ component: Products });

const SHARES = [0.58, 0.29, 0.13];

function Products() {
	return (
		<>
			<PageHeader title="Products" meta={`${PRODUCTS.length}`}>
				<Control>
					<Plus size={13} />
					Add product
				</Control>
			</PageHeader>
			<div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
				<table className="w-full text-[13px]">
					<thead>
						<tr className="border-b border-line text-left">
							<th className="label-mono h-9 px-4 font-normal">Product</th>
							<th className="label-mono h-9 px-4 text-right font-normal">
								Revenue
							</th>
							<th className="label-mono h-9 px-4 text-right font-normal">
								Costs
							</th>
							<th className="label-mono h-9 px-4 text-right font-normal">
								Profit
							</th>
							<th className="label-mono h-9 px-4 text-right font-normal">
								Margin
							</th>
							<th className="h-9 w-40 px-4" />
						</tr>
					</thead>
					<tbody className="divide-y divide-line">
						{PRODUCTS.map((p, i) => {
							const profit = p.revenue - p.costs;
							const series = SERIES.profit.map((v) =>
								Math.round(v * SHARES[i]),
							);
							return (
								<tr key={p.name} className="hover:bg-surface-1">
									<td className="h-12 px-4">{p.name}</td>
									<td className="num px-4 text-right">{money(p.revenue)}</td>
									<td className="num px-4 text-right text-negative">
										{money(p.costs)}
									</td>
									<td className="num px-4 text-right">{money(profit)}</td>
									<td className="num px-4 text-right text-text-2">
										{Math.round((profit / p.revenue) * 100)}%
									</td>
									<td className="px-4 py-2">
										<AreaChart
											data={series}
											height={28}
											tone="positive"
											compact
										/>
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
