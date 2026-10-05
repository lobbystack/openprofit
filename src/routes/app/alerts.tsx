import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageHeader } from "#/components/app/shell";
import { getAlerts, setRuleEnabled } from "#/server/alerts.functions";

export const Route = createFileRoute("/app/alerts")({
	loader: () => getAlerts(),
	component: Alerts,
});

const RULE_LABELS = {
	cost_spike: (t: number | null) => [
		"Cost spike",
		`Any provider, ${Math.round((t ?? 1) * 100)}% over the weekly average`,
	],
	margin_floor: (t: number | null) => [
		"Margin floor",
		`Any product, under ${Math.round((t ?? 0.6) * 100)}% for a week`,
	],
	sync_failure: () => ["Sync failure", "Any connection"],
} as const;

const when = (ts: number) => {
	const d = new Date(ts);
	const sameDay = d.toDateString() === new Date().toDateString();
	return sameDay
		? `Today ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`
		: d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function Alerts() {
	const { alerts, rules } = Route.useLoaderData();
	const router = useRouter();
	const open = alerts.filter((a) => !a.resolvedAt).length;

	async function toggle(id: string, enabled: boolean) {
		await setRuleEnabled({ data: { id, enabled } });
		router.invalidate();
	}

	return (
		<>
			<PageHeader title="Alerts" meta={open ? `${open} open` : undefined} />

			{alerts.length > 0 && (
				<div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
					<ul className="divide-y divide-line">
						{alerts.map((a) => {
							const resolved = !!a.resolvedAt;
							return (
								<li
									key={a.id}
									className={`flex items-start gap-3 px-4 py-3 ${resolved ? "text-text-3" : ""}`}
								>
									<span
										className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
											resolved
												? "bg-surface-4"
												: a.tone === "negative"
													? "bg-negative"
													: a.tone === "pending"
														? "bg-pending"
														: "bg-ink"
										}`}
									/>
									<div className="flex-1">
										<div className="text-[13px]">{a.title}</div>
										{a.detail && (
											<div className="num mt-0.5 text-[12px] text-text-2">
												{a.detail}
											</div>
										)}
									</div>
									<span className="num text-[12px] text-text-3">
										{when(a.openedAt)}
									</span>
								</li>
							);
						})}
					</ul>
				</div>
			)}

			<div className={`label-mono ${alerts.length ? "mt-8" : "mt-4"}`}>
				Rules
			</div>
			<div className="mt-3 overflow-hidden rounded-xl border border-line bg-card">
				<ul className="divide-y divide-line">
					{rules.map((r) => {
						const [name, scope] = RULE_LABELS[r.kind](r.threshold);
						return (
							<li
								key={r.id}
								className="flex h-11 items-center px-4 text-[13px]"
							>
								<span className={`w-40 ${r.enabled ? "" : "text-text-3"}`}>
									{name}
								</span>
								<span className="flex-1 text-text-2">{scope}</span>
								<button
									type="button"
									onClick={() => toggle(r.id, !r.enabled)}
									className="flex items-center gap-1.5 text-[12px] text-text-2 hover:text-ink"
								>
									<span
										className={`h-1.5 w-1.5 rounded-full ${r.enabled ? "bg-positive" : "bg-surface-4"}`}
									/>
									{r.enabled ? "Email" : "Off"}
								</button>
							</li>
						);
					})}
				</ul>
			</div>
		</>
	);
}
