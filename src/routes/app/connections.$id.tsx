import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { PageHeader } from "#/components/app/shell";
import {
	PROVIDERS,
	type ProviderId,
	ProviderLogo,
} from "#/components/provider-logo";
import { money } from "#/lib/format";
import { getConnection, setMapping } from "#/server/mappings.functions";

export const Route = createFileRoute("/app/connections/$id")({
	loader: ({ params }) => getConnection({ data: { id: params.id } }),
	component: Connection,
});

function Connection() {
	const c = Route.useLoaderData();
	const router = useRouter();
	const p = PROVIDERS[c.provider];

	async function assign(subUnitId: string, productId: string | null) {
		await setMapping({ data: { connectionId: c.id, subUnitId, productId } });
		router.invalidate();
	}

	return (
		<>
			<PageHeader title={p?.name ?? c.provider} meta={c.label ?? undefined} />
			{c.subUnits.length > 0 ? (
				<div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
					<div className="flex items-center justify-between border-b border-line px-4 py-3">
						<span className="flex items-center gap-2 text-[13px]">
							{p && <ProviderLogo id={c.provider as ProviderId} size={14} />}
							{c.kind === "cost" ? "Costs by" : "Revenue by"}{" "}
							{c.provider === "openai"
								? "project"
								: c.provider === "anthropic"
									? "workspace"
									: c.provider === "cloudflare"
										? "zone"
										: "project"}
						</span>
						<span className="label-mono">This month</span>
					</div>
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
								<select
									value={u.productId ?? ""}
									onChange={(e) => assign(u.id, e.target.value || null)}
									className="h-7 w-40 rounded-md border border-line bg-paper px-1.5 text-[12px] outline-none focus:border-line-strong"
								>
									<option value="">Shared</option>
									{c.products.map((pr) => (
										<option key={pr.id} value={pr.id}>
											{pr.name}
										</option>
									))}
								</select>
							</li>
						))}
					</ul>
				</div>
			) : (
				<p className="mt-4 text-[13px] text-text-2">
					{c.kind === "revenue"
						? "Revenue counts toward every product."
						: "No projects reported yet."}
				</p>
			)}
			<Link
				to="/app/connections"
				className="mt-4 inline-block text-[13px] text-text-2 hover:text-ink"
			>
				Back
			</Link>
		</>
	);
}
