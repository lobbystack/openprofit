import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import { BadgeEmbed } from "#/components/badge-embed";
import { AreaChart } from "#/components/dashboard/area-chart";
import { Logo } from "#/components/logo";
import { type ProviderId, ProviderLogo } from "#/components/provider-logo";
import { Card } from "#/components/ui/card";
import { seo } from "#/lib/app";
import { money } from "#/lib/format";
import { providerName } from "#/lib/providers";
import { getPublicProduct } from "#/server/public.functions";

export const Route = createFileRoute("/p/$workspace/$product")({
	// Agents asking for markdown get the page as markdown.
	server: {
		handlers: {
			GET: async ({ request, params, next }) => {
				if (!/text\/markdown/.test(request.headers.get("accept") ?? ""))
					return next();
				const { findPublic, publicPage, pageMarkdown } = await import(
					"#/server/public.server"
				);
				const found = await findPublic(params.workspace, params.product);
				if (!found) return new Response("Not found", { status: 404 });
				return new Response(pageMarkdown(await publicPage(found)), {
					headers: {
						"Content-Type": "text/markdown; charset=utf-8",
						Vary: "Accept",
					},
				});
			},
		},
	},
	loader: ({ params }) => getPublicProduct({ data: params }),
	head: ({ loaderData: d, params }) =>
		d
			? seo({
					title: `${d.product} by ${d.workspace} · OpenProfit`,
					description:
						d.mode === "revenue"
							? `Revenue over the last 30 days for ${d.product}, shared by ${d.workspace}.`
							: d.mode === "percent"
								? `Revenue growth and margin for ${d.product}, shared by ${d.workspace}.`
								: `Revenue, costs, profit and margin over the last 30 days for ${d.product}, shared by ${d.workspace}.`,
					path: `/p/${params.workspace}/${params.product}`,
					image: `${d.url}/og.png`,
				})
			: {},
	component: PublicPage,
	notFoundComponent: () => (
		<main className="flex min-h-screen items-center justify-center text-[13px] text-text-2">
			This page isn't public.
		</main>
	),
});

const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

function PublicPage() {
	const d = Route.useLoaderData();
	const fmt = (n: number) => money(n, { currency: d.currency });
	const tiles: [string, string][] = [];
	if (d.revenue !== null) tiles.push(["Revenue", fmt(d.revenue)]);
	if (d.costs !== null) tiles.push(["Costs", fmt(d.costs)]);
	if (d.profit !== null) tiles.push(["Profit", fmt(d.profit)]);
	if (d.mode === "percent")
		tiles.push(["Revenue growth", d.growth === null ? "–" : signed(d.growth)]);
	if (d.mode !== "revenue")
		tiles.push([
			"Margin",
			d.margin === null ? "–" : `${Math.round(d.margin)}%`,
		]);
	const providers = new Intl.ListFormat("en", { type: "conjunction" }).format(
		d.providers.map(providerName),
	);
	const selfReported = d.sources.some((s) => s.selfReported);

	return (
		<main className="mx-auto max-w-[800px] px-4 py-16">
			<div className="flex items-baseline justify-between">
				<div>
					<h1 className="text-[24px]">{d.product}</h1>
					<div className="mt-1 text-[13px] text-text-2">{d.workspace}</div>
				</div>
				<span className="label-mono">Last 30 days</span>
			</div>
			{d.verified && (
				<p className="mt-6 flex items-start gap-2 text-[13px] text-text-2">
					<BadgeCheck size={15} className="mt-px shrink-0 text-positive" />
					<span>
						<span className="text-ink">Verified.</span> OpenProfit reads these
						numbers from the{" "}
						{d.providers.length ? `${providers} APIs` : "providers' APIs"}.
						{selfReported &&
							" The owner entered the costs marked self-reported."}
					</span>
				</p>
			)}
			<Card className="mt-6">
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
				{d.chart && (
					<div className="border-t border-line px-3 pt-4 pb-2">
						<AreaChart
							data={d.chart.data}
							months={d.chart.months}
							tone={d.mode === "full" ? "positive" : "ink"}
							height={220}
							currency={d.currency}
						/>
					</div>
				)}
			</Card>
			{d.sources.length > 0 && (
				<Card className="mt-4">
					<div className="label-mono px-5 pt-4 pb-2">Costs</div>
					<ul className="divide-y divide-line">
						{d.sources.map((s) => (
							<li
								key={`${s.name}-${s.selfReported}`}
								className="flex items-center gap-3 px-5 py-3 text-[13px]"
							>
								{s.logo && <ProviderLogo id={s.logo as ProviderId} size={16} />}
								<span className="min-w-0 flex-1 truncate">{s.name}</span>
								{(s.selfReported || d.verified) && (
									<span className="text-[12px] text-text-2">
										{s.selfReported ? "Self-reported" : "Verified"}
									</span>
								)}
								{s.amount !== null && (
									<span className="num w-24 text-right">{fmt(s.amount)}</span>
								)}
							</li>
						))}
					</ul>
				</Card>
			)}
			{d.shared && (
				<p className="mt-3 text-[13px] text-text-2">
					Excludes{" "}
					{d.shared.amount !== null && (
						<span className="num">{fmt(d.shared.amount)} in </span>
					)}
					costs the owner hasn't assigned to a product.
				</p>
			)}
			{d.owner && (
				<Card className="mt-10 p-5">
					<div className="text-[13px]">Badge</div>
					<p className="mt-1 mb-4 text-[13px] text-text-2">
						Only members of {d.workspace} see this section. The badge shows what
						this page shows and links back to it.
					</p>
					<BadgeEmbed page={d.url} product={d.product} />
				</Card>
			)}
			<Link
				to="/"
				className="mt-6 inline-flex items-center gap-2 text-[12px] text-text-3 hover:text-ink"
			>
				<span className="h-1.5 w-1.5 rounded-full bg-brand" />
				Built with <Logo size={13} />
			</Link>
		</main>
	);
}
