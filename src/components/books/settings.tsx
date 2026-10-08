import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { SettingsRow, SettingsSection } from "#/components/app/shell";
import {
	PROVIDERS,
	type ProviderId,
	ProviderLogo,
} from "#/components/provider-logo";
import { Input } from "#/components/ui/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { Switch } from "#/components/ui/switch";
import {
	COUNTRIES,
	type Country,
	localDay,
	PAID_WITH,
	type PaidWith,
	REGIONS,
} from "#/lib/books-settings";
import {
	type getBooksSettings,
	setPaidWith,
	updateBooksSettings,
} from "#/server/books-settings.functions";

type Settings = Awaited<ReturnType<typeof getBooksSettings>>;
type Patch = Parameters<typeof updateBooksSettings>[0]["data"];

export const PAID_WITH_HELP =
	"When you pay a company bill with your personal card, the company owes you the money. If you switched, set the date you did.";

export function BooksSettings({ settings }: { settings: Settings }) {
	const router = useRouter();
	const update = useServerFn(updateBooksSettings);
	// Shows each change at once; the loader catches up after the save.
	const [draft, setDraft] = useState<Patch>({});
	const s = { ...settings, ...draft };
	const [since, setSince] = useState(settings.incorporatedOn ?? "");
	const country = s.country as Country | null;

	async function save(patch: Patch) {
		setDraft((d) => ({ ...d, ...patch }));
		try {
			await update({ data: patch });
		} finally {
			await router.invalidate({ sync: true });
			setDraft({});
		}
	}

	return (
		<div>
			<SettingsSection title="Business">
				<SettingsRow
					label="Incorporated company"
					description="Turn this on if your company files its own tax return."
					htmlFor="books-incorporated"
				>
					<Switch
						id="books-incorporated"
						checked={s.incorporatedOn !== null}
						onCheckedChange={(on) => {
							const day = on ? since || localDay() : null;
							if (day) setSince(day);
							void save({ incorporatedOn: day });
						}}
					/>
				</SettingsRow>
				{s.incorporatedOn !== null && (
					<SettingsRow
						label="Incorporated on"
						description="Sales and costs before this date count as your own."
						htmlFor="books-since"
					>
						<Input
							id="books-since"
							size="sm"
							type="date"
							required
							value={since}
							onChange={(e) => setSince(e.target.value)}
							onBlur={() => {
								if (!since) setSince(settings.incorporatedOn ?? "");
								else if (since !== settings.incorporatedOn)
									void save({ incorporatedOn: since });
							}}
							className="num w-40"
						/>
					</SettingsRow>
				)}
				<SettingsRow
					label="Country"
					description="The yearly report uses this country's tax forms."
					htmlFor="books-country"
				>
					<NativeSelect
						id="books-country"
						size="sm"
						value={country ?? ""}
						onChange={(e) =>
							save({ country: (e.target.value || null) as Country | null })
						}
					>
						{Object.entries(COUNTRIES).map(([code, name]) => (
							<NativeSelectOption key={code} value={code}>
								{name}
							</NativeSelectOption>
						))}
						<NativeSelectOption value="">Other</NativeSelectOption>
					</NativeSelect>
				</SettingsRow>
				{country && (
					<SettingsRow
						label={country === "CA" ? "Province" : "State"}
						htmlFor="books-region"
					>
						<NativeSelect
							id="books-region"
							size="sm"
							value={s.region ?? ""}
							onChange={(e) =>
								save({ country, region: e.target.value || null })
							}
						>
							<NativeSelectOption value="" disabled>
								Choose
							</NativeSelectOption>
							{Object.entries(REGIONS[country]).map(([code, name]) => (
								<NativeSelectOption key={code} value={code}>
									{name}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</SettingsRow>
				)}
			</SettingsSection>

			{s.incorporatedOn !== null && (
				<SettingsSection title="Paid with">
					<p className="px-4 py-3 text-[12px] text-text-2">{PAID_WITH_HELP}</p>
					{settings.connections.length + settings.costs.length === 0 && (
						<p className="px-4 py-3 text-[13px] text-text-2">
							No costs yet. Connect a provider or add a cost on the Costs page.
						</p>
					)}
					{settings.connections.map((c) => {
						const name =
							PROVIDERS[c.provider as ProviderId]?.name ?? c.provider;
						return (
							<PayerRow
								key={c.id}
								label={c.label ? `${name}, ${c.label}` : name}
								icon={
									PROVIDERS[c.provider as ProviderId] && (
										<ProviderLogo id={c.provider as ProviderId} size={14} />
									)
								}
							>
								<PaidWithPicker
									target="connection"
									id={c.id}
									name={name}
									paidWith={c.paidWith}
									paidWithSince={c.paidWithSince}
								/>
							</PayerRow>
						);
					})}
					{settings.costs.map((f) => (
						<PayerRow key={f.id} label={f.name}>
							<PaidWithPicker
								target="cost"
								id={f.id}
								name={f.name}
								paidWith={f.paidWith}
								paidWithSince={f.paidWithSince}
								dated={f.interval !== "once"}
							/>
						</PayerRow>
					))}
				</SettingsSection>
			)}
		</div>
	);
}

// A label on the left and a PaidWithPicker kept on one line on the right.
export function PayerRow({
	label,
	icon,
	description,
	children,
}: {
	label: string;
	icon?: React.ReactNode;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2 px-4 py-2.5 text-[13px] sm:min-h-12 sm:flex-row sm:items-center sm:gap-8">
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-2">
					{icon}
					<span className="truncate">{label}</span>
				</span>
				{description && (
					<span className="mt-0.5 block text-[12px] text-text-2">
						{description}
					</span>
				)}
			</span>
			<span className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap">
				{children}
			</span>
		</div>
	);
}

// Who pays a cost connection or a manual cost, saved on change. The date
// saves when the field loses focus, so typing a year doesn't save each digit.
export function PaidWithPicker({
	target,
	id,
	name,
	paidWith,
	paidWithSince,
	dated = true,
}: {
	target: "connection" | "cost";
	id: string;
	// For the controls' accessible names.
	name: string;
	paidWith: PaidWith;
	paidWithSince: string | null;
	// One-time costs have a single date, so no "since".
	dated?: boolean;
}) {
	const router = useRouter();
	const set = useServerFn(setPaidWith);
	const [v, setV] = useState({ paidWith, since: paidWithSince ?? "" });

	async function save(next: typeof v) {
		setV(next);
		await set({
			data: {
				target,
				id,
				paidWith: next.paidWith,
				paidWithSince: next.since || null,
			},
		});
		await router.invalidate({ sync: true });
	}

	return (
		<>
			<NativeSelect
				size="sm"
				aria-label={`${name}: paid with`}
				value={v.paidWith}
				onChange={(e) => save({ ...v, paidWith: e.target.value as PaidWith })}
				className="w-auto"
			>
				{Object.entries(PAID_WITH).map(([k, label]) => (
					<NativeSelectOption key={k} value={k}>
						{label}
					</NativeSelectOption>
				))}
			</NativeSelect>
			{dated && (
				<>
					<span className="text-text-3">since</span>
					<Input
						size="sm"
						type="date"
						aria-label={`${name}: paid with it since`}
						value={v.since}
						onChange={(e) => setV({ ...v, since: e.target.value })}
						onBlur={() => {
							if (v.since !== (paidWithSince ?? "")) void save(v);
						}}
						className="num w-36"
					/>
				</>
			)}
		</>
	);
}
