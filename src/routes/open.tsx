import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Footer } from "#/components/landing/footer";
import { Nav } from "#/components/landing/nav";
import { Card } from "#/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table";
import { SITE_URL, seo } from "#/lib/app";
import { money } from "#/lib/format";
import { getOpenBoard } from "#/server/public.functions";

const TABS = [
	["profit", "Profit"],
	["revenue", "Revenue"],
	["margin", "Margin"],
	["growth", "Growth"],
] as const;
type Tab = (typeof TABS)[number][0];
const tabSchema = z.enum(["profit", "revenue", "margin", "growth"]);

export const Route = createFileRoute("/open")({
	// Self-hosted instances send visitors to the hosted leaderboard (the
	// loader does the same on client navigation). Agents asking for markdown
	// get the table as markdown.
	server: {
		handlers: {
			GET: async ({ request, next }) => {
				if (process.env.APP_MODE !== "cloud")
					return Response.redirect(`${SITE_URL}/open`, 307);
				if (!/text\/markdown/.test(request.headers.get("accept") ?? ""))
					return next();
				const { openBoard, openMarkdown } = await import(
					"#/server/public.server"
				);
				return new Response(openMarkdown(await openBoard()), {
					headers: {
						"Content-Type": "text/markdown; charset=utf-8",
						Vary: "Accept",
					},
				});
			},
		},
	},
	validateSearch: (s: Record<string, unknown>): { by?: Tab } => ({
		by: tabSchema.optional().catch(undefined).parse(s.by),
	}),
	head: () =>
		seo({
			title: "The database of open product profit · OpenProfit",
			description:
				"Revenue, costs and profit from products that publish their numbers, read from Stripe, OpenAI, Vercel and other provider APIs.",
			path: "/open",
		}),
	loader: () => getOpenBoard(),
	component: Open,
});

const pct = (n: number | null, sign = false) =>
	n === null ? "–" : `${sign && n > 0 ? "+" : ""}${Math.round(n)}%`;
const usd = (n: number | null) => (n === null ? "–" : money(n));

function Open() {
	const rows = Route.useLoaderData();
	const by = Route.useSearch().by ?? "profit";
	// A product appears on a tab only when its page shows that number.
	const ranked = rows
		.filter((r) => r[by] !== null)
		.sort((a, b) => (b[by] ?? 0) - (a[by] ?? 0))
		.slice(0, 100);
	const cols: [Tab, string, (r: (typeof rows)[number]) => string][] = [
		["revenue", "Revenue", (r) => usd(r.revenue)],
		["profit", "Profit", (r) => usd(r.profit)],
		["margin", "Margin", (r) => pct(r.margin)],
		["growth", "Growth", (r) => pct(r.growth, true)],
	];

	return (
		<>
			<Nav />
			<main className="mx-auto w-full max-w-[1024px] px-4 pt-28 pb-24">
				<h1 className="display text-[36px]">
					The database of open product profit
				</h1>
				<p className="prose-landing mt-3 max-w-[600px]">
					Products that publish their revenue and costs on OpenProfit, read from
					Stripe, OpenAI, Vercel and other provider APIs. Rankings cover the
					last 30 days, in US dollars.
				</p>
				<nav className="mt-10 flex gap-1 text-[14px]">
					{TABS.map(([key, label]) => (
						<Link
							key={key}
							to="/open"
							search={key === "profit" ? {} : { by: key }}
							className={`rounded-md px-3 py-1.5 ${
								key === by
									? "bg-surface-2 text-ink"
									: "text-text-2 hover:text-ink"
							}`}
						>
							{label}
						</Link>
					))}
				</nav>
				<Card className="mt-4 overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-12">#</TableHead>
								<TableHead>Product</TableHead>
								{cols.map(([key, label]) => (
									<TableHead
										key={key}
										className={`text-right ${key === by ? "text-ink" : "hidden md:table-cell"}`}
									>
										{label}
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{ranked.map((r, i) => (
								<TableRow key={`${r.workspaceSlug}/${r.productSlug}`}>
									<TableCell className="num text-text-2">{i + 1}</TableCell>
									<TableCell className="h-14">
										<Link
											to="/p/$workspace/$product"
											params={{
												workspace: r.workspaceSlug,
												product: r.productSlug,
											}}
											className="hover:underline"
										>
											{r.product}
										</Link>
										<div className="text-[12px] text-text-2">{r.workspace}</div>
									</TableCell>
									{cols.map(([key, , show]) => (
										<TableCell
											key={key}
											className={`num text-right ${key === by ? "" : "hidden text-text-2 md:table-cell"}`}
										>
											{show(r)}
										</TableCell>
									))}
								</TableRow>
							))}
							{ranked.length === 0 && (
								<TableRow>
									<TableCell colSpan={6} className="py-4 text-text-2">
										No products qualify yet.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</Card>
				<p className="mt-4 max-w-[600px] text-[13px] text-text-2">
					A product shows up here when its public page is on, it has revenue and
					a cost source, and it has 30 days of history. A dash means the owner
					keeps that number private. Pages set to growth and margin appear on
					those two tabs only.{" "}
					<Link
						to="/docs/$slug"
						params={{ slug: "public-pages" }}
						className="text-ink underline"
					>
						Publish yours
					</Link>
					.
				</p>
			</main>
			<Footer />
		</>
	);
}
