import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "#/components/app/shell";
import { PLANS, type Plan } from "#/lib/plans";
import { openPortal, startCheckout } from "#/server/billing.functions";
import { CURRENCIES } from "#/server/onboarding.functions";
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

const planLabel = (p: Plan) =>
	PLANS[p].priceCents
		? `${PLANS[p].name} · $${PLANS[p].priceCents / 100} / mo`
		: PLANS[p].name;

const input =
	"h-8 rounded-md border border-line bg-paper px-2.5 text-[13px] outline-none focus:border-line-strong";

function Settings() {
	const s = Route.useLoaderData();
	const router = useRouter();
	const [name, setName] = useState(s.name);
	const [sent, setSent] = useState(false);
	const [billingError, setBillingError] = useState<string | null>(null);

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
						<select
							value={s.currency}
							onChange={(e) =>
								save({
									currency: e.target.value as (typeof CURRENCIES)[number],
								})
							}
							className={`${input} num`}
						>
							{CURRENCIES.map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</select>
					</Row>
					<Row label="Sync">
						<select
							value={
								s.cloud
									? Math.max(s.cadenceMinutes, PLANS[s.plan].cadenceMinutes)
									: s.cadenceMinutes
							}
							onChange={(e) =>
								save({
									cadenceMinutes: Number(
										e.target.value,
									) as (typeof CADENCES)[number],
								})
							}
							className={input}
						>
							{CADENCES.map((c) => {
								const locked = s.cloud && c < PLANS[s.plan].cadenceMinutes;
								const needs = locked
									? c <= PLANS.pro.cadenceMinutes
										? "Pro"
										: "Indie"
									: null;
								return (
									<option key={c} value={c} disabled={locked}>
										{cadenceLabel(c)}
										{needs ? ` (${needs})` : ""}
									</option>
								);
							})}
						</select>
					</Row>
					{s.cloud ? (
						<Row label="Plan">
							{planLabel(s.plan)}
							{s.plan === "free" && (
								<>
									<Go
										onError={setBillingError}
										onClick={() => startCheckout({ data: { plan: "indie" } })}
									>
										Indie, $19
									</Go>
									<Go
										onError={setBillingError}
										onClick={() => startCheckout({ data: { plan: "pro" } })}
									>
										Pro, $49
									</Go>
								</>
							)}
							{s.plan === "indie" && (
								<Go
									onError={setBillingError}
									onClick={() => startCheckout({ data: { plan: "pro" } })}
								>
									Pro, $49
								</Go>
							)}
							{s.plan !== "free" && (
								<Go
									onError={setBillingError}
									onClick={() => openPortal()}
									className="ml-auto"
								>
									Manage billing
								</Go>
							)}
							{billingError && (
								<span className="text-[12px] text-negative">
									{billingError}
								</span>
							)}
						</Row>
					) : (
						<Row label="Plan">Self-hosted</Row>
					)}
					{!s.cloud && (
						<Row label="Usage ping">
							<button
								type="button"
								onClick={() => save({ telemetry: !s.telemetry })}
								className="flex items-center gap-1.5 text-[13px] hover:text-ink"
							>
								<span
									className={`h-1.5 w-1.5 rounded-full ${s.telemetry ? "bg-positive" : "bg-surface-4"}`}
								/>
								{s.telemetry
									? "Daily: version and counts, nothing else"
									: "Off"}
							</button>
						</Row>
					)}
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

// Button that sends the browser to a URL a server function returns.
function Go({
	onClick,
	onError,
	className = "",
	children,
}: {
	onClick: () => Promise<{ url: string }>;
	onError?: (message: string) => void;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={async () => {
				try {
					const { url } = await onClick();
					window.location.href = url;
				} catch (err) {
					onError?.(err instanceof Error ? err.message : String(err));
				}
			}}
			className={`h-7 rounded-md border border-line bg-paper px-2.5 text-[12px] hover:border-line-strong ${className}`}
		>
			{children}
		</button>
	);
}
