import {
	createFileRoute,
	useLoaderData,
	useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
	PageHeader,
	SettingsRow,
	SettingsSection,
	Switch,
} from "#/components/app/shell";
import { CURRENCIES, cadenceLabel } from "#/lib/format";
import { CADENCES, PLANS, type Plan } from "#/lib/plans";
import { openPortal, startCheckout } from "#/server/billing.functions";
import {
	getSettings,
	type Settings as SettingsData,
	updateSettings,
} from "#/server/settings.functions";

export const Route = createFileRoute("/app/settings")({
	head: () => ({ meta: [{ title: "Settings · OpenProfit" }] }),
	loader: () => getSettings(),
	component: Settings,
});

const usd = (cents: number) => `$${(cents / 100).toLocaleString("en-US")}`;
const planLabel = (p: Plan) => {
	const { name, priceCents, mrrCapCents } = PLANS[p];
	const price = priceCents ? `, ${usd(priceCents)} a month` : "";
	return mrrCapCents
		? `${name}${price}, up to ${usd(mrrCapCents)} MRR`
		: `${name}${price}`;
};

// Monday first; values are JavaScript's getDay() numbers.
const DAYS: [number, string][] = [
	[1, "Monday"],
	[2, "Tuesday"],
	[3, "Wednesday"],
	[4, "Thursday"],
	[5, "Friday"],
	[6, "Saturday"],
	[0, "Sunday"],
];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const field =
	"h-8 w-full rounded-md border border-line bg-paper px-2.5 text-[13px] outline-none focus:border-line-strong";

type Patch = Parameters<typeof updateSettings>[0]["data"];

function Settings() {
	const loaded = Route.useLoaderData();
	const router = useRouter();
	const update = useServerFn(updateSettings);
	const checkoutFn = useServerFn(startCheckout);
	const portal = useServerFn(openPortal);
	const posthog = useLoaderData({ from: "__root__", select: (d) => !!d.key });
	// Shows each change at once; the loader catches up after the save.
	const [draft, setDraft] = useState<Partial<SettingsData>>({});
	const s = { ...loaded, ...draft };
	const [name, setName] = useState(s.name);
	const [billingError, setBillingError] = useState<string | null>(null);

	const checkout = (plan: "indie" | "pro") => checkoutFn({ data: { plan } });

	async function save(patch: Patch) {
		setDraft((d) => ({ ...d, ...patch }));
		try {
			await update({ data: patch });
		} finally {
			await router.invalidate({ sync: true });
			setDraft({});
		}
	}
	// The weekly schedule follows the time zone of whoever last saved it.
	const saveWeekly = (patch: Patch) =>
		save({ ...patch, timezone: browserZone() });
	const saveName = () => {
		const next = name.trim();
		if (next && next !== s.name) void save({ name: next });
	};

	return (
		<>
			<PageHeader title="Settings" />

			<SettingsSection title="Workspace">
				<SettingsRow label="Name" htmlFor="ws-name">
					<input
						id="ws-name"
						value={name}
						maxLength={60}
						onChange={(e) => setName(e.target.value)}
						onBlur={saveName}
						onKeyDown={(e) => e.key === "Enter" && saveName()}
						className={field}
					/>
				</SettingsRow>
				<SettingsRow
					label="Base currency"
					description="Every amount converts at the European Central Bank rate for its day. Changing the currency converts past amounts again."
					htmlFor="ws-currency"
				>
					<select
						id="ws-currency"
						value={s.currency}
						onChange={(e) =>
							save({
								currency: e.target.value as (typeof CURRENCIES)[number],
							})
						}
						className={`${field} num`}
					>
						{CURRENCIES.map((c) => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</select>
				</SettingsRow>
				<SettingsRow
					label="Sync"
					description="How often OpenProfit reads new data from your connections."
					htmlFor="ws-sync"
				>
					<select
						id="ws-sync"
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
						className={field}
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
				</SettingsRow>
			</SettingsSection>

			<SettingsSection title="Plan">
				{s.cloud ? (
					<SettingsRow
						label="Current plan"
						description={
							billingError ? (
								<span className="text-negative">{billingError}</span>
							) : (
								planLabel(s.plan)
							)
						}
					>
						{s.plan === "free" && (
							<Go onError={setBillingError} onClick={() => checkout("indie")}>
								Upgrade to Indie, $19/mo
							</Go>
						)}
						{s.plan !== "pro" && (
							<Go onError={setBillingError} onClick={() => checkout("pro")}>
								Upgrade to Pro, $49/mo
							</Go>
						)}
						{s.plan !== "free" && (
							<Go onError={setBillingError} onClick={() => portal()}>
								Manage billing
							</Go>
						)}
					</SettingsRow>
				) : (
					<SettingsRow label="Current plan">
						<span className="text-[13px] text-text-2">Self-hosted</span>
					</SettingsRow>
				)}
			</SettingsSection>

			<SettingsSection title="Email">
				<SettingsRow
					label="Weekly email"
					description="Every member gets last week's revenue, costs and profit."
					htmlFor="weekly"
				>
					<Switch
						id="weekly"
						checked={s.weeklyEmail}
						onChange={(weeklyEmail) => saveWeekly({ weeklyEmail })}
					/>
				</SettingsRow>
				{s.weeklyEmail && (
					<>
						<SettingsRow label="Day" htmlFor="weekly-day">
							<select
								id="weekly-day"
								value={s.weeklyDay}
								onChange={(e) =>
									saveWeekly({ weeklyDay: Number(e.target.value) })
								}
								className={field}
							>
								{DAYS.map(([d, label]) => (
									<option key={d} value={d}>
										{label}
									</option>
								))}
							</select>
						</SettingsRow>
						<SettingsRow
							label="Time"
							description={`Your time zone: ${s.timezone}`}
							htmlFor="weekly-hour"
						>
							<select
								id="weekly-hour"
								value={s.weeklyHour}
								onChange={(e) =>
									saveWeekly({ weeklyHour: Number(e.target.value) })
								}
								className={`${field} num`}
							>
								{HOURS.map((h) => (
									<option key={h} value={h}>
										{`${String(h).padStart(2, "0")}:00`}
									</option>
								))}
							</select>
						</SettingsRow>
					</>
				)}
			</SettingsSection>

			{(posthog || !s.cloud) && (
				<SettingsSection title="Privacy">
					{posthog && (
						<SettingsRow
							label="Analytics"
							description="Sends PostHog the actions you take in the dashboard and a replay of each session, with all text and inputs hidden."
							htmlFor="analytics"
						>
							<Switch
								id="analytics"
								checked={s.analytics}
								onChange={(analytics) => save({ analytics })}
							/>
						</SettingsRow>
					)}
					{!s.cloud && (
						<SettingsRow
							label="Usage ping"
							description="Once a day, sends this instance's version and its workspace, product and connection counts."
							htmlFor="telemetry"
						>
							<Switch
								id="telemetry"
								checked={s.telemetry}
								onChange={(telemetry) => save({ telemetry })}
							/>
						</SettingsRow>
					)}
				</SettingsSection>
			)}
		</>
	);
}

// Button that sends the browser to a URL a server function returns.
function Go({
	onClick,
	onError,
	children,
}: {
	onClick: () => Promise<{ url: string }>;
	onError?: (message: string) => void;
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
			className="h-8 rounded-md border border-line bg-paper px-2.5 text-[13px] hover:border-line-strong"
		>
			{children}
		</button>
	);
}
