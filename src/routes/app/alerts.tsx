import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, Switch } from "#/components/app/shell";
import { RULE_NAMES, ruleScope } from "#/lib/alerts";
import { getAlerts, setRuleEnabled } from "#/server/alerts.functions";

export const Route = createFileRoute("/app/alerts")({
	head: () => ({ meta: [{ title: "Alerts · OpenProfit" }] }),
	loader: () => getAlerts(),
	component: Alerts,
});

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
	const setEnabled = useServerFn(setRuleEnabled);
	const open = alerts.filter((a) => !a.resolvedAt).length;

	async function toggle(id: string, enabled: boolean) {
		await setEnabled({ data: { id, enabled } });
		await router.invalidate({ sync: true });
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

			{alerts.length === 0 && (
				<p className="mt-4 rounded-xl border border-line bg-card px-4 py-4 text-[13px] text-text-2">
					No alerts yet. One opens here when a rule below finds something, and
					every member gets one email about it.
				</p>
			)}

			<div className="label-mono mt-8">Rules</div>
			<p className="mt-2 text-[12px] text-text-2">
				A rule that's on opens an alert here and emails every member once per
				alert. Off stops both.
			</p>
			<div className="mt-3 overflow-hidden rounded-xl border border-line bg-card">
				<ul className="divide-y divide-line">
					{rules.map((r) => (
						<li
							key={r.id}
							className="flex min-h-11 items-center gap-3 px-4 py-2 text-[13px]"
						>
							<label
								htmlFor={`rule-${r.id}`}
								className={`w-32 shrink-0 ${r.enabled ? "" : "text-text-3"}`}
							>
								{RULE_NAMES[r.kind]}
							</label>
							<span className="flex-1 text-text-2">
								{ruleScope(r.kind, r.threshold)}
							</span>
							<span className="w-24 text-right text-[12px] text-text-2">
								{r.enabled ? "Email on" : "Off"}
							</span>
							<Switch
								id={`rule-${r.id}`}
								checked={r.enabled}
								onChange={(on) => toggle(r.id, on)}
							/>
						</li>
					))}
				</ul>
			</div>
		</>
	);
}
