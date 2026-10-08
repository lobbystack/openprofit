import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "#/components/app/shell";
import {
	PAID_WITH_HELP,
	PaidWithPicker,
	PayerRow,
} from "#/components/books/settings";
import {
	PROVIDERS,
	type ProviderId,
	ProviderLogo,
} from "#/components/provider-logo";
import { Card, CardHeader, CardTitle } from "#/components/ui/card";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { money } from "#/lib/format";
import {
	getConnection,
	setConnectionProduct,
	setMapping,
} from "#/server/mappings.functions";

export const Route = createFileRoute("/app/connections/$id")({
	head: () => ({ meta: [{ title: "Connection · OpenProfit" }] }),
	loader: ({ params }) => getConnection({ data: { id: params.id } }),
	component: Connection,
});

// What a provider's sub-unit is called. Stripe and Polar lines have none.
const UNIT: Record<string, string> = {
	paddle: "product",
	lemonsqueezy: "product",
	revenuecat: "project",
	openai: "project",
	anthropic: "workspace",
	openrouter: "API key",
	vercel: "project",
	cloudflare: "zone",
	railway: "project",
	digitalocean: "project",
	github: "repository",
	neon: "project",
	mongodb: "project",
	firecrawl: "API key",
	resend: "domain",
};

function Connection() {
	const c = Route.useLoaderData();
	const router = useRouter();
	const map = useServerFn(setMapping);
	const setProduct = useServerFn(setConnectionProduct);
	const p = PROVIDERS[c.provider];
	const unit = UNIT[c.provider] ?? "project";

	async function assign(subUnitId: string, productId: string | null) {
		await map({ data: { connectionId: c.id, subUnitId, productId } });
		router.invalidate();
	}

	async function assignConnection(productId: string | null) {
		await setProduct({ data: { connectionId: c.id, productId } });
		router.invalidate();
	}

	// Assigned to a product, or Unassigned: unassigned lines count in All.
	const select = (
		value: string | null,
		onChange: (v: string | null) => void,
	) => (
		<NativeSelect
			size="xs"
			className="w-40"
			value={value ?? ""}
			onChange={(e) => onChange(e.target.value || null)}
		>
			<NativeSelectOption value="">Unassigned</NativeSelectOption>
			{c.products.map((pr) => (
				<NativeSelectOption key={pr.id} value={pr.id}>
					{pr.name}
				</NativeSelectOption>
			))}
		</NativeSelect>
	);

	const kind = c.kind === "cost" ? "Costs" : "Revenue";

	return (
		<>
			<PageHeader title={p?.name ?? c.provider} meta={c.label ?? undefined} />
			{c.subUnits.length === 0 ? (
				<Card className="mt-4 flex h-11 items-center justify-between px-4 text-[13px]">
					<span>{kind} from this connection</span>
					{select(c.productId, assignConnection)}
				</Card>
			) : (
				<Card className="mt-4 overflow-hidden">
					<CardHeader className="py-3">
						<CardTitle>
							{p && <ProviderLogo id={c.provider as ProviderId} size={14} />}
							{kind} by {unit}
						</CardTitle>
						<span className="label-mono">This month</span>
					</CardHeader>
					<ul className="divide-y divide-line">
						{c.subUnits.map((u) => (
							<li
								key={u.id}
								className="flex h-11 items-center gap-3 px-4 text-[13px]"
							>
								<span className="flex-1 truncate">
									{u.label ?? u.id}
									{u.label && (
										<span className="num ml-2 text-[11px] text-text-3">
											{u.id}
										</span>
									)}
								</span>
								<span className="num w-24 text-right">{money(u.amount)}</span>
								{select(u.productId, (v) => assign(u.id, v))}
							</li>
						))}
						{c.withoutSubUnit && (
							<li className="flex h-11 items-center gap-3 px-4 text-[13px]">
								<span className="flex-1 truncate text-text-2">
									Not in a {unit}
								</span>
								<span className="num w-24 text-right">
									{money(c.withoutSubUnit.amount)}
								</span>
								{select(c.productId, assignConnection)}
							</li>
						)}
					</ul>
				</Card>
			)}
			{c.kind === "cost" && c.incorporated && (
				<Card className="mt-4">
					<PayerRow label="Paid with" description={PAID_WITH_HELP}>
						<PaidWithPicker
							target="connection"
							id={c.id}
							name={p?.name ?? c.provider}
							paidWith={c.paidWith}
							paidWithSince={c.paidWithSince}
						/>
					</PayerRow>
				</Card>
			)}
			<Link
				to="/app/connections"
				className="mt-4 inline-block text-[13px] text-text-2 hover:text-ink"
			>
				All connections
			</Link>
		</>
	);
}
