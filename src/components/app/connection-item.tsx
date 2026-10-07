import { Link } from "@tanstack/react-router";
import { PROVIDERS, ProviderLogo } from "#/components/provider-logo";
import { describeError } from "#/lib/errors";
import { cadenceLabel, money } from "#/lib/format";
import type { ConnectionRow } from "#/server/connections.functions";

const ago = (ts: number | null) => {
	if (!ts) return "Not synced yet";
	const m = Math.round((Date.now() - ts) / 60_000);
	return m < 1
		? "just now"
		: m < 60
			? `${m} min ago`
			: `${Math.round(m / 60)} h ago`;
};

// One connection in the list: provider, kind, sync status, cadence and this
// month's amount. In the app the name links to its page and children are
// the row's buttons; /demo passes neither.
export function ConnectionItem({
	row: r,
	linked = false,
	children,
}: {
	row: ConnectionRow;
	linked?: boolean;
	children?: React.ReactNode;
}) {
	const p = PROVIDERS[r.provider];
	const name = p?.name ?? r.provider;
	return (
		<li className="flex min-h-12 items-center gap-3 px-4 py-2 text-[13px]">
			<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-paper">
				{p && <ProviderLogo id={r.provider} size={14} />}
			</span>
			<span className="w-32 shrink-0">
				{linked ? (
					<Link
						to="/app/connections/$id"
						params={{ id: r.id }}
						className="block hover:underline"
					>
						{name}
					</Link>
				) : (
					<span className="block">{name}</span>
				)}
				{r.label && (
					<span className="num block text-[11px] text-text-3">{r.label}</span>
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
					<span className="truncate text-negative" title={r.lastError ?? ""}>
						{r.lastError
							? describeError(name, r.lastError).text
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
			{children && (
				<span className="flex shrink-0 items-center gap-1">{children}</span>
			)}
		</li>
	);
}
