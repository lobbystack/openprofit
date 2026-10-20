import {
	Bell,
	Coins,
	CreditCard,
	FileText,
	Globe,
	Landmark,
	Layers,
	Mail,
	Receipt,
	RefreshCw,
	Scale,
	Tag,
} from "lucide-react";
import { AreaChart } from "../dashboard/area-chart";
import { MetricRow } from "../dashboard/metric-row";
import {
	COSTS_BY_PROVIDER,
	MOCK_OVERVIEW,
	money,
	SERIES,
} from "../dashboard/mock-data";
import { PROVIDERS, type ProviderId, ProviderLogo } from "../provider-logo";
import { Container, Section, SectionHeader, Triplet } from "./primitives";

// Feature section: header block, product visual, triplet. One per capability.

export function FeatureProfit() {
	const previous = SERIES.profit.map((v) => Math.round(v * 0.88));
	return (
		<Section>
			<Container className="py-24">
				<div id="product">
					<SectionHeader
						eyebrow="Profit"
						tone="positive"
						title="Measure what you keep"
						cta="How revenue is counted"
						href="/docs/connectors#sales-tax-and-vat"
					>
						Revenue after processor fees, refunds and sales tax, minus your AI,
						hosting and other bills, for each app you run.
					</SectionHeader>
				</div>
				<div className="mt-14 rounded-xl border border-line bg-card">
					<MetricRow data={MOCK_OVERVIEW} selected="profit" />
					<div className="border-t border-line px-3 pt-4 pb-2">
						<AreaChart
							data={SERIES.profit}
							previous={previous}
							months={MOCK_OVERVIEW.months}
							tone="positive"
							height={240}
						/>
					</div>
				</div>
				<Triplet
					items={[
						{
							icon: <Scale size={16} />,
							title: "Net of fees and refunds",
							text: "Refunds and Stripe, Paddle and Polar fees come off revenue, and sales tax stays out of it.",
						},
						{
							icon: <Globe size={16} />,
							title: "One currency",
							text: "Paid in euros, billed in dollars. Everything converts at that day's rate.",
						},
						{
							icon: <Layers size={16} />,
							title: "Profit per app",
							text: "Three apps on one OpenAI account, and you still see which one pays for itself.",
						},
					]}
				/>
			</Container>
		</Section>
	);
}

const ROWS = COSTS_BY_PROVIDER.slice(0, 6);

export function FeatureCosts() {
	const total = ROWS.reduce((a, r) => a + r.amount, 0);
	return (
		<Section>
			<Container className="py-24">
				<SectionHeader
					eyebrow="Costs"
					tone="negative"
					title="Every bill in one place"
					cta="How syncing works"
					href="/docs/connectors"
				>
					OpenAI, Vercel, Neon, Resend and 10 more providers report your spend
					by day or month and by project. Where a provider reports only usage,
					OpenProfit prices it at the published rates. Bills without an API go
					in as flat costs.
				</SectionHeader>
				<div className="mt-14 grid gap-4 md:grid-cols-[1fr_320px]">
					<div className="rounded-xl border border-line bg-card">
						<div className="flex items-center justify-between border-b border-line px-4 py-3">
							<span className="text-[13px]">Connections</span>
							<span className="label-mono">This month · {money(total)}</span>
						</div>
						<ul className="divide-y divide-line">
							{ROWS.map((r) => {
								const p = PROVIDERS[r.id];
								return (
									<li key={r.id} className="flex h-12 items-center gap-3 px-4">
										<span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-paper">
											<ProviderLogo id={r.id as ProviderId} size={14} />
										</span>
										<span className="w-24 text-[13px] md:w-28">{p.name}</span>
										<span className="hidden items-center gap-1.5 text-[12px] text-text-2 sm:flex">
											<span className="h-1.5 w-1.5 rounded-full bg-positive" />
											Synced
										</span>
										<span className="ml-auto hidden num text-[12px] text-text-3 sm:inline">
											hourly
										</span>
										<span className="num ml-auto w-20 text-right text-[13px] sm:ml-0">
											{money(r.amount)}
										</span>
									</li>
								);
							})}
						</ul>
					</div>
					<div className="rounded-xl border border-line bg-card p-4">
						<div className="text-[13px]">Add a flat cost</div>
						<div className="mt-3 space-y-2">
							{[
								["Supabase Pro", "$25 / mo"],
								["Domain · draftly.app", "$14 / yr"],
								["Figma", "$15 / mo"],
							].map(([name, price]) => (
								<div
									key={name}
									className="flex h-9 items-center justify-between rounded-md border border-line bg-paper px-3 text-[13px]"
								>
									<span>{name}</span>
									<span className="num text-text-2">{price}</span>
								</div>
							))}
						</div>
						<div className="mt-3 flex h-9 items-center justify-between rounded-md border border-dashed border-line-strong px-3 text-[13px] text-text-3">
							<span>Name</span>
							<span className="num">$0.00</span>
						</div>
					</div>
				</div>
				<Triplet
					items={[
						{
							icon: <RefreshCw size={16} />,
							title: "Usage billing",
							text: "Per-token and per-GB charges come from each provider's billing or usage data.",
						},
						{
							icon: <Receipt size={16} />,
							title: "Bills without an API",
							text: "Enter Supabase, a domain or a laptop once, at its monthly, yearly or one-time price.",
						},
						{
							icon: <Tag size={16} />,
							title: "Mapped to products",
							text: "Point each OpenAI or Vercel project at the app it serves. The rest stays unassigned until you decide.",
						},
					]}
				/>
			</Container>
		</Section>
	);
}

// A year on the T2125, in dollars: sales minus the four expense lines is the
// net income line.
const TAX_LINES = [
	["8000", "Adjusted gross sales", 14280],
	["8871", "Management and administration fees", 512],
	["8860", "Professional fees", 600],
	["9270", "Other expenses", 2184],
	["9936", "Capital cost allowance", 1366],
	["9369", "Net income before adjustments", 9618],
] as const;

// Synced totals, a line down to the tax report, then the form's lines.
export function FeatureTaxes() {
	return (
		<Section>
			<Container className="py-24">
				<SectionHeader
					eyebrow="Taxes"
					tone="ink"
					title="Your tax numbers, from your API keys"
					cta="How the tax report works"
					href="/docs/books"
				>
					As your accounts sync, OpenProfit sorts every sale and bill onto the
					lines of your tax return. At tax time, copy the numbers in, export
					them to QuickBooks or Xero, or hand them to your accountant.
				</SectionHeader>
				<div className="mt-14 flex flex-col items-center rounded-xl border border-line bg-surface-1 px-4 py-10">
					<div className="grid w-full max-w-[240px] grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
						{[
							["Revenue", 14280],
							["Costs", 4662],
						].map(([label, amount]) => (
							<div key={label} className="bg-paper px-3 py-2.5">
								<div className="label-mono">{label}</div>
								<div className="num mt-1 text-[15px]">
									{money(amount as number)}
								</div>
							</div>
						))}
					</div>
					<span className="h-5 w-px bg-line-strong" />
					<div className="flex h-8 items-center gap-2 rounded-lg bg-ink pr-1.5 pl-3 text-[13px] text-paper">
						Tax report
						<span className="rounded-md bg-paper/15 px-1.5 py-0.5 text-[12px]">
							T2125
						</span>
					</div>
					<span className="h-5 w-px bg-line-strong" />
					<ul className="w-full max-w-[420px] space-y-1.5">
						{TAX_LINES.map(([line, name, amount]) => (
							<li
								key={line}
								className="flex min-h-10 items-center gap-3 rounded-md border border-line bg-paper px-3 py-2 text-[13px]"
							>
								<span className="num w-9 shrink-0 text-text-3">{line}</span>
								<span className="min-w-0">{name}</span>
								<span className="num ml-auto">{money(amount)}</span>
							</li>
						))}
					</ul>
				</div>
				<Triplet
					items={[
						{
							icon: <FileText size={16} />,
							title: "Line-by-line totals",
							text: "Get the number for each line of your return, with or without a company.",
						},
						{
							icon: <CreditCard size={16} />,
							title: "Personal card costs",
							text: "Count the bills you paid yourself as business costs.",
						},
						{
							icon: <Landmark size={16} />,
							title: "Official sources",
							text: "See the government guide behind every number.",
						},
					]}
				/>
			</Container>
		</Section>
	);
}

export function FeatureWeekly() {
	return (
		<Section>
			<Container className="py-24">
				<SectionHeader
					eyebrow="Email"
					tone="ink"
					title="Hear about a doubled bill the next day"
				>
					A weekly email with last week's revenue, costs and profit, on the day
					and hour you pick. An alert email when a provider's daily spend
					doubles, a margin drops below its floor or a sync fails.
				</SectionHeader>
				<div className="mt-14 grid gap-4 md:grid-cols-2">
					<div className="rounded-xl border border-line bg-card p-6">
						<div className="label-mono">Monday 9:00</div>
						<div className="mt-3 text-[15px]">Last week across 3 products</div>
						<div className="mt-5 grid grid-cols-3 gap-4">
							{[
								["Revenue", "$2,912", "positive"],
								["Costs", "$741", "negative"],
								["Profit", "$2,171", "positive"],
							].map(([l, v, t]) => (
								<div key={l}>
									<div className="label-mono">{l}</div>
									<div
										className={`num mt-2 text-[20px] ${t === "negative" ? "text-negative" : ""}`}
									>
										{v}
									</div>
								</div>
							))}
						</div>
						<div className="mt-5 border-t border-line pt-4 text-[13px] text-text-2">
							Biggest change: OpenAI, up 34% ($188).
						</div>
					</div>
					<div className="flex flex-col gap-3">
						{[
							[
								"OpenAI spend at 2.3x its daily average",
								"$96 yesterday, against $41 a day the week before",
								"negative",
							],
							[
								"Shipmail margin below 60%",
								"58% over the last 7 days",
								"pending",
							],
							["Vercel sync failed", "Vercel rejected the key.", "ink"],
						].map(([t, s, tone]) => (
							<div
								key={t}
								className="flex items-start gap-3 rounded-xl border border-line bg-card p-4"
							>
								<span
									className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
										tone === "negative"
											? "bg-negative"
											: tone === "pending"
												? "bg-pending"
												: "bg-ink"
									}`}
								/>
								<div>
									<div className="text-[13px]">{t}</div>
									<div className="num mt-0.5 text-[12px] text-text-2">{s}</div>
								</div>
							</div>
						))}
					</div>
				</div>
				<Triplet
					items={[
						{
							icon: <Mail size={16} />,
							title: "Weekly summary",
							text: "Revenue, costs, profit and the provider that moved most. Free on every plan.",
						},
						{
							icon: <Bell size={16} />,
							title: "Spike alerts",
							text: "Every member gets one email when an alert opens. Turn each rule on or off.",
						},
						{
							icon: <Coins size={16} />,
							title: "Public pages",
							text: "Share an app's numbers on a page anyone can open. You choose what shows.",
						},
					]}
				/>
			</Container>
		</Section>
	);
}
