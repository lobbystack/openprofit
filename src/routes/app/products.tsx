import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Plus, X } from "lucide-react";
import { useState } from "react";
import { Control, PageHeader } from "#/components/app/shell";
import { AreaChart } from "#/components/dashboard/area-chart";
import { money } from "#/lib/format";
import { getOverview } from "#/server/overview.functions";
import { createProduct, deleteProduct } from "#/server/products.functions";
import { setPublicPage } from "#/server/public.functions";

export const Route = createFileRoute("/app/products")({
	loader: () => getOverview(),
	component: Products,
});

const TH = "label-mono h-9 px-4 font-normal";

function Products() {
	const data = Route.useLoaderData();
	const router = useRouter();
	const create = useServerFn(createProduct);
	const del = useServerFn(deleteProduct);
	const setPage = useServerFn(setPublicPage);
	const [adding, setAdding] = useState(false);
	const [name, setName] = useState("");
	const fmt = (n: number) => money(n, { currency: data.currency });
	const products = data.byProduct.filter((p) => p.id !== "shared");
	const shared = data.byProduct.find((p) => p.id === "shared");

	async function add(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		await create({ data: { name } });
		setName("");
		setAdding(false);
		router.invalidate();
	}

	async function remove(id: string, name: string) {
		if (
			!window.confirm(
				`Remove ${name}? Its costs and revenue move to Shared, and its public page goes offline.`,
			)
		)
			return;
		await del({ data: { id } });
		router.invalidate();
	}

	return (
		<>
			<PageHeader title="Products" meta={`${products.length}`}>
				<Control onClick={() => setAdding(true)}>
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
							<th className={`${TH} w-36`}>Public</th>
							<th className="h-9 w-10 px-2" />
						</tr>
					</thead>
					<tbody className="divide-y divide-line">
						{[...products, ...(shared ? [shared] : [])].map((p) => {
							const profit = p.revenue - p.costs;
							const isShared = p.id === "shared";
							return (
								<tr
									key={p.id}
									className={isShared ? "text-text-2" : "hover:bg-surface-1"}
								>
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
										{p.profit.some((v) => v !== 0) && (
											<AreaChart
												data={p.profit}
												height={28}
												tone="positive"
												compact
											/>
										)}
									</td>
									<td className="px-4">
										{!isShared && (
											<span className="flex items-center gap-1">
												<select
													value={p.publicPage}
													onChange={async (e) => {
														await setPage({
															data: {
																id: p.id,
																mode: e.target.value as
																	| "off"
																	| "full"
																	| "revenue"
																	| "percent",
															},
														});
														router.invalidate();
													}}
													className="h-7 rounded-md border border-line bg-paper px-1.5 text-[12px] outline-none focus:border-line-strong"
												>
													<option value="off">Off</option>
													<option value="full">Full</option>
													<option value="revenue">Revenue</option>
													<option value="percent">Growth and margin</option>
												</select>
												{p.publicPage !== "off" && (
													<a
														href={`/p/${data.workspaceSlug}/${p.slug}`}
														target="_blank"
														rel="noreferrer"
														title="Open page"
														className="flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:bg-surface-2 hover:text-ink"
													>
														<ArrowUpRight size={13} />
													</a>
												)}
											</span>
										)}
									</td>
									<td className="px-2">
										{!isShared && (
											<button
												type="button"
												title="Remove"
												onClick={() => remove(p.id, p.name)}
												className="flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:bg-surface-2 hover:text-negative"
											>
												<X size={13} />
											</button>
										)}
									</td>
								</tr>
							);
						})}
						{products.length === 0 && !adding && (
							<tr>
								<td colSpan={8} className="px-4 py-4 text-text-2">
									No products yet. Add one for each app or site you sell, then
									assign its costs and revenue on each connection's page.
								</td>
							</tr>
						)}
						{adding && (
							<tr>
								<td colSpan={8} className="px-4 py-2">
									<form onSubmit={add} className="flex items-center gap-2">
										<input
											value={name}
											onChange={(e) => setName(e.target.value)}
											placeholder="Product name"
											className="h-8 w-64 rounded-md border border-line bg-paper px-2.5 text-[13px] outline-none placeholder:text-text-3 focus:border-line-strong"
										/>
										<button
											type="submit"
											className="h-8 rounded-md bg-ink px-3 text-[13px] text-paper hover:bg-ink-2"
										>
											Add
										</button>
										<button
											type="button"
											onClick={() => setAdding(false)}
											className="h-8 px-2 text-[13px] text-text-2 hover:text-ink"
										>
											Cancel
										</button>
									</form>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</>
	);
}
