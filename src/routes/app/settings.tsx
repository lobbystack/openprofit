import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "#/components/app/shell";
import {
	CADENCES,
	getSettings,
	sendWeeklyNow,
	updateSettings,
} from "#/server/settings.functions";

export const Route = createFileRoute("/app/settings")({
	loader: () => getSettings(),
	component: Settings,
});

const cadenceLabel = (m: number) =>
	m === 15
		? "Every 15 min"
		: m === 60
			? "Hourly"
			: m === 360
				? "Every 6 h"
				: "Daily";

const PLAN = { free: "Free", indie: "Indie · $19 / mo", pro: "Pro · $49 / mo" };

const input =
	"h-8 rounded-md border border-line bg-paper px-2.5 text-[13px] outline-none focus:border-line-strong";

function Settings() {
	const s = Route.useLoaderData();
	const router = useRouter();
	const [name, setName] = useState(s.name);
	const [sent, setSent] = useState(false);

	async function save(patch: Parameters<typeof updateSettings>[0]["data"]) {
		await updateSettings({ data: patch });
		router.invalidate();
	}

	return (
		<>
			<PageHeader title="Settings" />
			<div className="mt-4 overflow-hidden rounded-xl border border-line bg-card">
				<ul className="divide-y divide-line">
					<Row label="Workspace">
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							onBlur={() => name.trim() && name !== s.name && save({ name })}
							className={`${input} w-64`}
						/>
					</Row>
					<Row label="Base currency">
						<span className="num">{s.currency}</span>
					</Row>
					<Row label="Sync">
						<select
							value={s.cadenceMinutes}
							onChange={(e) =>
								save({
									cadenceMinutes: Number(
										e.target.value,
									) as (typeof CADENCES)[number],
								})
							}
							className={input}
						>
							{CADENCES.map((c) => (
								<option key={c} value={c}>
									{cadenceLabel(c)}
								</option>
							))}
						</select>
					</Row>
					<Row label="Plan">{PLAN[s.plan]}</Row>
					<Row label="Weekly email">
						<button
							type="button"
							onClick={() => save({ weeklyEmail: !s.weeklyEmail })}
							className="flex items-center gap-1.5 text-[13px] hover:text-ink"
						>
							<span
								className={`h-1.5 w-1.5 rounded-full ${s.weeklyEmail ? "bg-positive" : "bg-surface-4"}`}
							/>
							{s.weeklyEmail ? `Monday 09:00, ${s.email}` : "Off"}
						</button>
						<button
							type="button"
							onClick={async () => {
								await sendWeeklyNow();
								setSent(true);
							}}
							className="ml-auto text-[12px] text-text-3 hover:text-ink"
						>
							{sent ? "Sent" : "Send now"}
						</button>
					</Row>
				</ul>
			</div>
		</>
	);
}

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<li className="flex h-12 items-center px-4 text-[13px]">
			<span className="w-40 text-text-2">{label}</span>
			<span className="flex flex-1 items-center gap-3">{children}</span>
		</li>
	);
}
