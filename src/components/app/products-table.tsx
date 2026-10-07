import { AreaChart } from "#/components/dashboard/area-chart";
import { Card } from "#/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { money } from "#/lib/format";
import type { OverviewData } from "#/lib/overview";

type Product = OverviewData["byProduct"][number];

// Products, then Shared, with their period numbers and profit trend. The app
// passes `publicPage` and `remove` for its controls and extra rows as
// children; /demo passes neither.
export function ProductsTable({
	data,
	publicPage,
	remove,
	children,
}: {
	data: OverviewData;
	publicPage?: (p: Product) => React.ReactNode;
	remove?: (p: Product) => React.ReactNode;
	children?: React.ReactNode;
}) {
	const fmt = (n: number) => money(n, { currency: data.currency });
	const products = data.byProduct.filter((p) => p.id !== "shared");
	const shared = data.byProduct.find((p) => p.id === "shared");
	return (
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
						{publicPage && <TableHead className="w-36">Public</TableHead>}
						{remove && <TableHead className="w-10 px-2" />}
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
								<TableCell className="num text-right">{fmt(profit)}</TableCell>
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
								{publicPage && (
									<TableCell>{!isShared && publicPage(p)}</TableCell>
								)}
								{remove && (
									<TableCell className="px-2">
										{!isShared && remove(p)}
									</TableCell>
								)}
							</TableRow>
						);
					})}
					{children}
				</TableBody>
			</Table>
		</Card>
	);
}
