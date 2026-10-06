import { createFileRoute } from "@tanstack/react-router";
import { AreaChart } from "#/components/dashboard/area-chart";
import { Logo } from "#/components/logo";
import { seo } from "#/lib/app";
import { delta, money } from "#/lib/format";
import { getPublicProduct } from "#/server/public.functions";

export const Route = createFileRoute("/p/$workspace/$product")({
	loader: ({ params }) => getPublicProduct({ data: params }),
	head: ({ loaderData: d, params }) =>
		d
			? seo({
					title: `${d.product} by ${d.workspace} · OpenProfit`,
					description:
						d.mode === "revenue"
							? `This month's revenue for ${d.product}, shared by ${d.workspace}.`
							: d.mode === "percent"
								? `Revenue growth and margin for ${d.product}, shared by ${d.workspace}.`
								: `This month's revenue, costs, profit and margin for ${d.product}, shared by ${d.workspace}.`,
					path: `/p/${params.workspace}/${params.product}`,
				})
			: {},
	component: PublicPage,
	notFoundComponent: () => (
		<main className="flex min-h-screen items-center justify-center text-[13px] text-text-2">
			This page isn't public.
		</main>
	),
});

function PublicPage() {
	const { workspace, product, mode, series } = Route.useLoaderData();
	const last = (s: number[]) => s[s.length - 1] ?? 0;
	const fmt = (n: number) => money(n, { currency: series.currency });
	const margin = last(series.revenue)
		? Math.round((last(series.profit) / last(series.revenue)) * 100)
		: 0;

	const tiles =
		mode === "percent"
			? [
					[
						"Revenue growth",
						`${delta(series.revenue) >= 0 ? "+" : ""}${delta(series.revenue).toFixed(1)}%`,
					],
					["Margin", `${margin}%`],
				]
			: mode === "revenue"
				? [["Revenue", fmt(last(series.revenue))]]
				: [
						["Revenue", fmt(last(series.revenue))],
						["Costs", fmt(last(series.costs))],
						["Profit", fmt(last(series.profit))],
						["Margin", `${margin}%`],
					];
	const chart =
		mode === "full"
			? { data: series.profit, tone: "positive" as const }
			: mode === "revenue"
				? { data: series.revenue, tone: "ink" as const }
				: null;

	return (
		<main className="mx-auto max-w-[800px] px-4 py-16">
			<div className="flex items-baseline justify-between">
				<div>
					<h1 className="text-[24px]">{product}</h1>
					<div className="mt-1 text-[13px] text-text-2">{workspace}</div>
				</div>
				<span className="label-mono">This month</span>
			</div>
			<div className="mt-8 rounded-xl border border-line bg-card">
				<div
					className="grid divide-x divide-line"
					style={{
						gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`,
					}}
				>
					{tiles.map(([label, value]) => (
						<div key={label} className="px-5 py-4">
							<div className="label-mono">{label}</div>
							<div className="num mt-3 text-[22px] leading-none">{value}</div>
						</div>
					))}
				</div>
				{chart && (
					<div className="border-t border-line px-3 pt-4 pb-2">
						<AreaChart
							data={chart.data}
							months={series.months}
							tone={chart.tone}
							height={220}
						/>
					</div>
				)}
			</div>
			<a
				href="/"
				className="mt-6 inline-flex items-center gap-2 text-[12px] text-text-3 hover:text-ink"
			>
				<span className="h-1.5 w-1.5 rounded-full bg-brand" />
				Built with <Logo size={13} />
			</a>
		</main>
	);
}
