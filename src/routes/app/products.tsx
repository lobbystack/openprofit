import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Plus, X } from "lucide-react";
import { useState } from "react";
import { useConfirm } from "#/components/app/confirm";
import { PageHeader } from "#/components/app/shell";
import { AreaChart } from "#/components/dashboard/area-chart";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { money } from "#/lib/format";
import { getOverview } from "#/server/overview.functions";
import { createProduct, deleteProduct } from "#/server/products.functions";
import { setPublicPage } from "#/server/public.functions";

export const Route = createFileRoute("/app/products")({
	head: () => ({ meta: [{ title: "Products · OpenProfit" }] }),
	loader: () => getOverview(),
	component: Products,
});

function Products() {
	const data = Route.useLoaderData();
	const router = useRouter();
	const create = useServerFn(createProduct);
	const del = useServerFn(deleteProduct);
	const [confirm, confirmDialog] = useConfirm();
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
		const ok = await confirm({
			title: `Remove ${name}?`,
			description:
				"Its costs and revenue move to Shared, and its public page goes offline.",
			action: "Remove product",
		});
		if (!ok) return;
		await del({ data: { id } });
		router.invalidate();
	}

	return (
		<>
			{confirmDialog}
			<PageHeader title="Products" meta={`${products.length}`}>
				<Button variant="outline" onClick={() => setAdding(true)}>
					<Plus size={13} />
					Add product
				</Button>
			</PageHeader>
			<Card className="mt-4 overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Product</TableHead>
							<TableHead className="text-right">Revenue</TableHead>
							<TableHead className="text-right">Costs</TableHead>
							<TableHead className="text-right">Profit</TableHead>
							<TableHead className="text-right">Margin</TableHead>
							<TableHead className="w-40" />
							<TableHead className="w-36">Public</TableHead>
							<TableHead className="w-10 px-2" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{[...products, ...(shared ? [shared] : [])].map((p) => {
							const profit = p.revenue - p.costs;
							const isShared = p.id === "shared";
							return (
								<TableRow
									key={p.id}
									className={isShared ? "text-text-2" : undefined}
								>
									<TableCell className="h-12">{p.name}</TableCell>
									<TableCell className="num text-right">
										{fmt(p.revenue)}
									</TableCell>
									<TableCell className="num text-right text-negative">
										{fmt(p.costs)}
									</TableCell>
									<TableCell className="num text-right">
										{fmt(profit)}
									</TableCell>
									<TableCell className="num text-right text-text-2">
										{p.revenue
											? `${Math.round((profit / p.revenue) * 100)}%`
											: ""}
									</TableCell>
									<TableCell className="py-2">
										{p.profit.some((v) => v !== 0) && (
											<AreaChart
												data={p.profit}
												height={28}
												tone="positive"
												compact
											/>
										)}
									</TableCell>
									<TableCell>
										{!isShared && (
											<span className="flex items-center gap-1">
												<NativeSelect
													size="xs"
													className="w-auto"
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
												>
													<NativeSelectOption value="off">
														Off
													</NativeSelectOption>
													<NativeSelectOption value="full">
														Full
													</NativeSelectOption>
													<NativeSelectOption value="revenue">
														Revenue
													</NativeSelectOption>
													<NativeSelectOption value="percent">
														Growth and margin
													</NativeSelectOption>
												</NativeSelect>
												{p.publicPage !== "off" && (
													<Button
														variant="quiet"
														size="icon-sm"
														nativeButton={false}
														render={
															// biome-ignore lint/a11y/useAnchorContent: Button puts the icon inside
															<a
																href={`/p/${data.workspaceSlug}/${p.slug}`}
																target="_blank"
																rel="noreferrer"
																title="Open page"
															/>
														}
													>
														<ArrowUpRight size={13} />
													</Button>
												)}
											</span>
										)}
									</TableCell>
									<TableCell className="px-2">
										{!isShared && (
											<Button
												variant="quiet-destructive"
												size="icon-sm"
												title="Remove"
												onClick={() => remove(p.id, p.name)}
											>
												<X size={13} />
											</Button>
										)}
									</TableCell>
								</TableRow>
							);
						})}
						{products.length === 0 && !adding && (
							<TableRow>
								<TableCell colSpan={8} className="py-4 text-text-2">
									No products yet. Add one for each app or site you sell, then
									assign its costs and revenue on each connection's page.
								</TableCell>
							</TableRow>
						)}
						{adding && (
							<TableRow>
								<TableCell colSpan={8} className="py-2">
									<form onSubmit={add} className="flex items-center gap-2">
										<Input
											size="sm"
											className="w-64"
											value={name}
											onChange={(e) => setName(e.target.value)}
											placeholder="Product name"
										/>
										<Button type="submit">Add</Button>
										<Button
											type="button"
											variant="ghost"
											onClick={() => setAdding(false)}
										>
											Cancel
										</Button>
									</form>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</Card>
		</>
	);
}
