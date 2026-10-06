import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { Control, PageHeader } from "#/components/app/shell";
import { AreaChart } from "#/components/dashboard/area-chart";
import { BreakdownCard } from "#/components/dashboard/breakdown-card";
import { providerLabel } from "#/components/dashboard/overview";
import { PeriodSelect } from "#/components/dashboard/period-select";
import { CURRENCIES, money, monthLabel } from "#/lib/format";
import { type PeriodKey, periodSchema } from "#/lib/overview";
import {
	createFlatCost,
	deleteFlatCost,
	type FlatCostRow,
	getFlatCosts,
	updateFlatCost,
} from "#/server/costs.functions";
import { getOverview } from "#/server/overview.functions";

export const Route = createFileRoute("/app/costs")({
	head: () => ({ meta: [{ title: "Costs · OpenProfit" }] }),
	validateSearch: (s: Record<string, unknown>): { period?: PeriodKey } => ({
		period: periodSchema.catch("this-month").parse(s.period),
	}),
	loaderDeps: ({ search }) => ({ period: search.period ?? "this-month" }),
	loader: async ({ deps }) => {
		const [overview, flat] = await Promise.all([
			getOverview({ data: { period: deps.period } }),
			getFlatCosts(),
		]);
		return { overview, ...flat };
	},
	component: Costs,
});

function Costs() {
	const { overview, flats, products } = Route.useLoaderData();
	const navigate = useNavigate();
	const router = useRouter();
	const del = useServerFn(deleteFlatCost);
	// "new", a flat cost's id, or null when the form is closed.
	const [editing, setEditing] = useState<string | null>(null);
	const fmt = (n: number) => money(n, { currency: overview.currency });
	const close = async () => {
		setEditing(null);
		await router.invalidate({ sync: true });
	};

	async function remove(f: FlatCostRow) {
		if (
			!window.confirm(
				`Remove ${f.name}? It stops counting in costs and profit for every month, past months included. To keep past months, set an end date instead.`,
			)
		)
			return;
		await del({ data: { id: f.id } });
		await router.invalidate({ sync: true });
	}

	return (
		<>
			<PageHeader title="Costs" meta={fmt(overview.period.totals.costs)}>
				<PeriodSelect
					value={overview.period.key}
					onChange={(period) =>
						navigate({ to: "/app/costs", search: { period } })
					}
				/>
				<Control onClick={() => setEditing("new")}>
					<Plus size={13} />
					Add flat cost
				</Control>
			</PageHeader>

			<div className="mt-4 rounded-xl border border-line bg-card px-3 pt-4 pb-2">
				<AreaChart
					data={overview.series.costs}
					previous={overview.previousSeries.costs}
					months={overview.months}
					tone="negative"
					height={200}
				/>
			</div>

			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<BreakdownCard
					tabs={["By provider"]}
					total={overview.costsByProvider.reduce((a, c) => a + c.amount, 0)}
					rows={overview.costsByProvider.map((c) => ({
						label: providerLabel(c.provider),
						value: c.amount,
					}))}
					formatter={fmt}
				/>
				<BreakdownCard
					tabs={["By product"]}
					total={overview.byProduct.reduce((a, p) => a + p.costs, 0)}
					rows={overview.byProduct.map((p) => ({
						label: p.name,
						value: p.costs,
					}))}
					formatter={fmt}
				/>
			</div>

			<div className="label-mono mt-8">Flat costs</div>
			<div className="mt-3 overflow-hidden rounded-xl border border-line bg-card">
				{editing === "new" && (
					<FlatCostForm
						products={products}
						currency={overview.currency}
						onDone={close}
					/>
				)}
				{flats.length === 0 && editing !== "new" ? (
					<p className="px-4 py-4 text-[13px] text-text-2">
						No flat costs yet. Add hosting plans, domains or tools that have no
						billing API, at their monthly or yearly price.
					</p>
				) : (
					<ul className="divide-y divide-line">
						{flats.map((f) =>
							editing === f.id ? (
								<li key={f.id}>
									<FlatCostForm
										cost={f}
										products={products}
										currency={overview.currency}
										onDone={close}
									/>
								</li>
							) : (
								<li
									key={f.id}
									className="flex min-h-11 items-center gap-3 px-4 py-2 text-[13px]"
								>
									<span className="min-w-0 flex-1">
										<span className="block truncate">{f.name}</span>
										<span className="block text-[12px] text-text-3">
											{span(f)}
										</span>
									</span>
									<span className="hidden w-32 truncate text-text-2 sm:block">
										{f.product ?? "Shared"}
									</span>
									<span className="num w-24 text-right">
										{money(f.amount, { currency: f.currency, cents: true })}
									</span>
									<span className="label-mono w-10 text-right">
										/ {f.interval === "year" ? "yr" : "mo"}
									</span>
									<span className="flex shrink-0 items-center gap-1">
										<button
											type="button"
											title="Edit"
											aria-label={`Edit ${f.name}`}
											onClick={() => setEditing(f.id)}
											className="flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:bg-surface-2 hover:text-ink"
										>
											<Pencil size={13} />
										</button>
										<button
											type="button"
											title="Remove"
											aria-label={`Remove ${f.name}`}
											onClick={() => remove(f)}
											className="flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:bg-surface-2 hover:text-negative"
										>
											<X size={13} />
										</button>
									</span>
								</li>
							),
						)}
					</ul>
				)}
			</div>
		</>
	);
}

const monthYear = (day: string) =>
	`${monthLabel(day.slice(0, 7))} ${day.slice(0, 4)}`;

const span = (f: FlatCostRow) =>
	f.endsOn
		? `${monthYear(f.startsOn)} to ${monthYear(f.endsOn)}`
		: `Since ${monthYear(f.startsOn)}`;

const field =
	"mt-1.5 h-8 w-full rounded-md border border-line bg-paper px-2.5 text-[13px] outline-none focus:border-line-strong";

function FlatCostForm({
	cost,
	products,
	currency,
	onDone,
}: {
	cost?: FlatCostRow;
	products: { id: string; name: string }[];
	currency: string;
	onDone: () => void;
}) {
	const create = useServerFn(createFlatCost);
	const update = useServerFn(updateFlatCost);
	const thisMonth = `${new Date().toISOString().slice(0, 7)}-01`;
	const [v, setV] = useState({
		name: cost?.name ?? "",
		amount: cost ? String(cost.amount) : "",
		currency: cost?.currency ?? currency,
		interval: cost?.interval ?? "month",
		startsOn: cost?.startsOn ?? thisMonth,
		endsOn: cost?.endsOn ?? "",
		productId: cost?.productId ?? "",
	});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const set = (k: keyof typeof v) => (e: { target: { value: string } }) =>
		setV({ ...v, [k]: e.target.value });

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		const amountCents = Math.round(Number(v.amount.replace(",", ".")) * 100);
		if (!(amountCents > 0)) {
			setError("Enter an amount above zero.");
			return;
		}
		if (v.endsOn && v.endsOn < v.startsOn) {
			setError("The end date is before the start date.");
			return;
		}
		const data = {
			name: v.name.trim(),
			amountCents,
			currency: v.currency as (typeof CURRENCIES)[number],
			interval: v.interval as "month" | "year",
			startsOn: v.startsOn,
			endsOn: v.endsOn || null,
			productId: v.productId || null,
		};
		setBusy(true);
		setError(null);
		try {
			if (cost) await update({ data: { id: cost.id, cost: data } });
			else await create({ data });
			onDone();
		} catch (err) {
			setBusy(false);
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	return (
		<form
			onSubmit={submit}
			className="grid gap-3 border-b border-line bg-surface-1 p-4 text-[13px] sm:grid-cols-6"
		>
			<label className="sm:col-span-3">
				<span className="label-mono">Name</span>
				<input
					required
					maxLength={80}
					value={v.name}
					onChange={set("name")}
					placeholder="Supabase Pro"
					className={field}
				/>
			</label>
			<label className="sm:col-span-3">
				<span className="label-mono">Product</span>
				<select
					value={v.productId}
					onChange={set("productId")}
					className={field}
				>
					<option value="">Shared</option>
					{products.map((p) => (
						<option key={p.id} value={p.id}>
							{p.name}
						</option>
					))}
				</select>
			</label>
			<label className="sm:col-span-2">
				<span className="label-mono">Amount</span>
				<input
					required
					inputMode="decimal"
					value={v.amount}
					onChange={set("amount")}
					placeholder="25.00"
					className={`${field} num`}
				/>
			</label>
			<label className="sm:col-span-2">
				<span className="label-mono">Currency</span>
				<select
					value={v.currency}
					onChange={set("currency")}
					className={`${field} num`}
				>
					{CURRENCIES.map((c) => (
						<option key={c} value={c}>
							{c}
						</option>
					))}
				</select>
			</label>
			<label className="sm:col-span-2">
				<span className="label-mono">Billed</span>
				<select value={v.interval} onChange={set("interval")} className={field}>
					<option value="month">Monthly</option>
					<option value="year">Yearly, spread over 12 months</option>
				</select>
			</label>
			<label className="sm:col-span-3">
				<span className="label-mono">Starts</span>
				<input
					type="date"
					required
					value={v.startsOn}
					onChange={set("startsOn")}
					className={`${field} num`}
				/>
			</label>
			<label className="sm:col-span-3">
				<span className="label-mono">Ends (optional)</span>
				<input
					type="date"
					value={v.endsOn}
					min={v.startsOn}
					onChange={set("endsOn")}
					className={`${field} num`}
				/>
			</label>
			<div className="flex flex-wrap items-center gap-2 sm:col-span-6">
				<button
					type="submit"
					disabled={busy}
					className="h-8 rounded-md bg-ink px-3 text-[13px] text-paper hover:bg-ink-2 disabled:opacity-50"
				>
					{busy ? "Saving…" : cost ? "Save" : "Add cost"}
				</button>
				<button
					type="button"
					onClick={onDone}
					className="h-8 px-2 text-[13px] text-text-2 hover:text-ink"
				>
					Cancel
				</button>
				{error && <span className="text-[12px] text-negative">{error}</span>}
			</div>
		</form>
	);
}
