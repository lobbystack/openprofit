import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "#/components/app/shell";
import {
	PROVIDERS,
	type ProviderId,
	ProviderLogo,
} from "#/components/provider-logo";
import { Button } from "#/components/ui/button";
import { describeError } from "#/lib/errors";
import { cadenceLabel, money } from "#/lib/format";
import {
	deleteConnection,
	getConnections,
	listConnectors,
	syncNow,
} from "#/server/connections.functions";

export const Route = createFileRoute("/app/connections/")({
	head: () => ({ meta: [{ title: "Connections · OpenProfit" }] }),
	loader: async () => {
		const [rows, available] = await Promise.all([
			getConnections(),
			listConnectors(),
		]);
		return { rows, available };
	},
	component: Connections,
});

// Providers without a connector, and how to count them anyway.
const ALTERNATIVE: Record<string, { label: string; to: string }> = {
	appstore: { label: "Via RevenueCat", to: "/app/connect/revenuecat" },
	googleplay: { label: "Via RevenueCat", to: "/app/connect/revenuecat" },
	supabase: { label: "As a flat cost", to: "/app/costs" },
};

const ago = (ts: number | null) => {
	if (!ts) return "Not synced yet";
	const m = Math.round((Date.now() - ts) / 60_000);
	return m < 1
		? "just now"
		: m < 60
			? `${m} min ago`
			: `${Math.round(m / 60)} h ago`;
};

function Connections() {
	const { rows, available } = Route.useLoaderData();
	const router = useRouter();
	const syncFn = useServerFn(syncNow);
	const del = useServerFn(deleteConnection);
	const [busy, setBusy] = useState<string | null>(null);
	const connected = new Set(rows.map((r) => r.provider));
	const implemented = new Set(available.map((c) => c.id));
	const tiles = (Object.keys(PROVIDERS) as ProviderId[]).filter(
		(id) => !connected.has(id),
	);

	async function sync(id: string) {
		setBusy(id);
		try {
			await syncFn({ data: { id } });
		} catch {
			// The row shows the error after invalidate.
		} finally {
			setBusy(null);
			router.invalidate();
		}
	}

	async function remove(id: string, name: string) {
		if (
			!window.confirm(
				`Remove the ${name} connection? Its synced revenue and costs are deleted. Reconnecting syncs the history again.`,
			)
		)
			return;
		setBusy(id);
		await del({ data: { id } });
		setBusy(null);
		router.invalidate();
	}

	return (
		<>
			<PageHeader title="Connections" meta={`${rows.length}`} />

			{rows.length === 0 && (
				<p className="mt-4 max-w-[560px] text-[13px] text-text-2">
					Start with your payment processor, then add the services you pay for.
					Each form links to where you create the key.
				</p>
			)}

			{rows.length > 0 && (
				<div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
					<ul className="divide-y divide-line">
						{rows.map((r) => {
							const p = PROVIDERS[r.provider];
							return (
								<li
									key={r.id}
									className="flex min-h-12 items-center gap-3 px-4 py-2 text-[13px]"
								>
									<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-paper">
										{p && <ProviderLogo id={r.provider} size={14} />}
									</span>
									<span className="w-32 shrink-0">
										<Link
											to="/app/connections/$id"
											params={{ id: r.id }}
											className="block hover:underline"
										>
											{p?.name ?? r.provider}
										</Link>
										{r.label && (
											<span className="num block text-[11px] text-text-3">
												{r.label}
											</span>
										)}
									</span>
									<span className="label-mono hidden w-20 sm:block">
										{r.kind === "revenue" ? "Revenue" : "Costs"}
									</span>
									<span className="hidden min-w-0 items-center gap-1.5 text-[12px] text-text-2 sm:flex">
										<span
											className={`h-1.5 w-1.5 shrink-0 rounded-full ${
												r.status === "active"
													? "bg-positive"
													: r.status === "error"
														? "bg-negative"
														: "bg-surface-4"
											}`}
										/>
										{r.status === "error" ? (
											<span
												className="truncate text-negative"
												title={r.lastError ?? ""}
											>
												{r.lastError
													? describeError(p?.name ?? r.provider, r.lastError)
															.text
													: "Sync failed"}
											</span>
										) : (
											ago(r.lastSyncedAt)
										)}
									</span>
									<span className="num ml-auto hidden shrink-0 whitespace-nowrap text-[12px] text-text-3 sm:inline">
										{cadenceLabel(r.cadenceMinutes)}
									</span>
									<span
										className={`num ml-auto w-24 shrink-0 text-right sm:ml-0 ${
											r.amount < 0 ? "text-negative" : ""
										}`}
									>
										{r.amount < 0 ? "−" : ""}
										{money(Math.abs(r.amount))}
									</span>
									<span className="flex shrink-0 items-center gap-1">
										<Button
											variant="quiet"
											size="icon-sm"
											title="Sync now"
											disabled={busy === r.id}
											onClick={() => sync(r.id)}
										>
											<RefreshCw
												size={13}
												className={
													busy === r.id
														? "animate-spin [animation-duration:700ms]"
														: ""
												}
											/>
										</Button>
										<Button
											variant="quiet-destructive"
											size="icon-sm"
											title="Remove"
											disabled={busy === r.id}
											onClick={() =>
												remove(r.id, PROVIDERS[r.provider]?.name ?? r.provider)
											}
										>
											<X size={13} />
										</Button>
									</span>
								</li>
							);
						})}
					</ul>
				</div>
			)}

			<div className={`label-mono ${rows.length ? "mt-8" : "mt-4"}`}>
				Available
			</div>
			<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
				{tiles.map((id) => {
					const p = PROVIDERS[id];
					const ready = implemented.has(id);
					const inner = (
						<>
							<ProviderLogo
								id={id}
								size={18}
								className={ready ? "" : "opacity-50 grayscale"}
							/>
							<span className="flex-1">{p.name}</span>
							{!ready && (
								<span className="label-mono">{ALTERNATIVE[id]?.label}</span>
							)}
						</>
					);
					const cls =
						"flex h-14 items-center gap-3 rounded-xl border border-line bg-card px-4 text-left text-[13px] transition-colors duration-150";
					return ready ? (
						<Link
							key={id}
							to="/app/connect/$provider"
							params={{ provider: id }}
							className={`${cls} hover:border-line-strong`}
						>
							{inner}
						</Link>
					) : (
						<Link
							key={id}
							to={ALTERNATIVE[id]?.to ?? "/app/costs"}
							className={`${cls} text-text-3 hover:border-line-strong`}
						>
							{inner}
						</Link>
					);
				})}
			</div>
		</>
	);
}
