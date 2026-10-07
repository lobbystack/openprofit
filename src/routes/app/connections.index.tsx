import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { useConfirm } from "#/components/app/confirm";
import { ConnectionItem } from "#/components/app/connection-item";
import { PageHeader } from "#/components/app/shell";
import {
	PROVIDERS,
	type ProviderId,
	ProviderLogo,
} from "#/components/provider-logo";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
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

function Connections() {
	const { rows, available } = Route.useLoaderData();
	const router = useRouter();
	const syncFn = useServerFn(syncNow);
	const del = useServerFn(deleteConnection);
	const [confirm, confirmDialog] = useConfirm();
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
		const ok = await confirm({
			title: `Remove the ${name} connection?`,
			description:
				"Its synced revenue and costs are deleted. Reconnecting syncs the history again.",
			action: "Remove connection",
		});
		if (!ok) return;
		setBusy(id);
		await del({ data: { id } });
		setBusy(null);
		router.invalidate();
	}

	return (
		<>
			{confirmDialog}
			<PageHeader title="Connections" meta={`${rows.length}`} />

			{rows.length === 0 && (
				<p className="mt-4 max-w-[560px] text-[13px] text-text-2">
					Start with your payment processor, then add the services you pay for.
					Each form links to where you create the key.
				</p>
			)}

			{rows.length > 0 && (
				<Card className="mt-4 overflow-hidden">
					<ul className="divide-y divide-line">
						{rows.map((r) => (
							<ConnectionItem key={r.id} row={r} linked>
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
							</ConnectionItem>
						))}
					</ul>
				</Card>
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
							<ProviderLogo id={id} size={18} />
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
							className={`${cls} hover:border-line-strong`}
						>
							{inner}
						</Link>
					);
				})}
			</div>
		</>
	);
}
