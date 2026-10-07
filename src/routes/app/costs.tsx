import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { useConfirm } from "#/components/app/confirm";
import { PageHeader } from "#/components/app/shell";
import { AreaChart } from "#/components/dashboard/area-chart";
import { BreakdownCard } from "#/components/dashboard/breakdown-card";
import { providerLabel } from "#/components/dashboard/overview";
import { PeriodSelect } from "#/components/dashboard/period-select";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
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
	const [confirm, confirmDialog] = useConfirm();
	// "new", a flat cost's id, or null when the form is closed.
	const [editing, setEditing] = useState<string | null>(null);
	const fmt = (n: number) => money(n, { currency: overview.currency });
	const close = async () => {
		setEditing(null);
		await router.invalidate({ sync: true });
	};

	async function remove(f: FlatCostRow) {
		const ok = await confirm({
			title: `Remove ${f.name}?`,
			description:
				"It stops counting in costs and profit for every month, past months included. To keep past months, set an end date instead.",
			action: "Remove cost",
		});
		if (!ok) return;
		await del({ data: { id: f.id } });
		await router.invalidate({ sync: true });
	}

	return (
		<>
			{confirmDialog}
			<PageHeader title="Costs" meta={fmt(overview.period.totals.costs)}>
				<PeriodSelect
					value={overview.period.key}
					onChange={(period) =>
						navigate({ to: "/app/costs", search: { period } })
					}
				/>
				<Button variant="outline" onClick={() => setEditing("new")}>
					<Plus size={13} />
					Add flat cost
				</Button>
			</PageHeader>

			<Card className="mt-4 px-3 pt-4 pb-2">
				<AreaChart
					data={overview.series.costs}
					previous={overview.previousSeries.costs}
					months={overview.months}
					tone="negative"
					height={200}
					currency={overview.currency}
				/>
			</Card>

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
			<Card className="mt-3 overflow-hidden">
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
										<Button
											variant="quiet"
											size="icon-sm"
											title="Edit"
											aria-label={`Edit ${f.name}`}
											onClick={() => setEditing(f.id)}
										>
											<Pencil size={13} />
										</Button>
										<Button
											variant="quiet-destructive"
											size="icon-sm"
											title="Remove"
											aria-label={`Remove ${f.name}`}
											onClick={() => remove(f)}
										>
											<X size={13} />
										</Button>
									</span>
								</li>
							),
						)}
					</ul>
				)}
			</Card>
		</>
	);
}

const monthYear = (day: string) =>
	`${monthLabel(day.slice(0, 7))} ${day.slice(0, 4)}`;

const span = (f: FlatCostRow) =>
	f.endsOn
		? `${monthYear(f.startsOn)} to ${monthYear(f.endsOn)}`
		: `Since ${monthYear(f.startsOn)}`;

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
			className="border-b border-line bg-surface-1 p-4 text-[13px]"
		>
			<FieldGroup className="grid gap-3 sm:grid-cols-6">
				<Field className="gap-1.5 sm:col-span-3">
					<FieldLabel htmlFor="flat-1">Name</FieldLabel>
					<Input
						id="flat-1"
						size="sm"
						required
						maxLength={80}
						value={v.name}
						onChange={set("name")}
						placeholder="Supabase Pro"
					/>
				</Field>
				<Field className="gap-1.5 sm:col-span-3">
					<FieldLabel htmlFor="flat-2">Product</FieldLabel>
					<NativeSelect
						id="flat-2"
						size="sm"
						value={v.productId}
						onChange={set("productId")}
					>
						<NativeSelectOption value="">Shared</NativeSelectOption>
						{products.map((p) => (
							<NativeSelectOption key={p.id} value={p.id}>
								{p.name}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</Field>
				<Field className="gap-1.5 sm:col-span-2">
					<FieldLabel htmlFor="flat-3">Amount</FieldLabel>
					<Input
						id="flat-3"
						size="sm"
						required
						inputMode="decimal"
						value={v.amount}
						onChange={set("amount")}
						placeholder="25.00"
						className="num"
					/>
				</Field>
				<Field className="gap-1.5 sm:col-span-2">
					<FieldLabel htmlFor="flat-4">Currency</FieldLabel>
					<NativeSelect
						id="flat-4"
						size="sm"
						value={v.currency}
						onChange={set("currency")}
						className="num"
					>
						{CURRENCIES.map((c) => (
							<NativeSelectOption key={c} value={c}>
								{c}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</Field>
				<Field className="gap-1.5 sm:col-span-2">
					<FieldLabel htmlFor="flat-5">Billed</FieldLabel>
					<NativeSelect
						id="flat-5"
						size="sm"
						value={v.interval}
						onChange={set("interval")}
					>
						<NativeSelectOption value="month">Monthly</NativeSelectOption>
						<NativeSelectOption value="year">
							Yearly, spread over 12 months
						</NativeSelectOption>
					</NativeSelect>
				</Field>
				<Field className="gap-1.5 sm:col-span-3">
					<FieldLabel htmlFor="flat-6">Starts</FieldLabel>
					<Input
						id="flat-6"
						size="sm"
						type="date"
						required
						value={v.startsOn}
						onChange={set("startsOn")}
						className="num"
					/>
				</Field>
				<Field className="gap-1.5 sm:col-span-3">
					<FieldLabel htmlFor="flat-7">Ends (optional)</FieldLabel>
					<Input
						id="flat-7"
						size="sm"
						type="date"
						value={v.endsOn}
						min={v.startsOn}
						onChange={set("endsOn")}
						className="num"
					/>
				</Field>
				<div className="flex flex-wrap items-center gap-2 sm:col-span-6">
					<Button type="submit" disabled={busy}>
						{busy ? "Saving…" : cost ? "Save" : "Add cost"}
					</Button>
					<Button type="button" variant="ghost" onClick={onDone}>
						Cancel
					</Button>
					{error && <span className="text-[12px] text-negative">{error}</span>}
				</div>
			</FieldGroup>
		</form>
	);
}
