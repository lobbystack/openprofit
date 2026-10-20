import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Logo } from "#/components/logo";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { identify } from "#/lib/analytics";
import { HEARD_FROM, HEARD_FROM_LABELS, isLocalPath, NOINDEX } from "#/lib/app";
import { localDay } from "#/lib/books-settings";
import { CURRENCIES } from "#/lib/format";
import { getAnalyticsConfig } from "#/server/analytics.functions";
import { getSession } from "#/server/auth.functions";
import { createWorkspaceFn } from "#/server/onboarding.functions";

export const Route = createFileRoute("/onboarding")({
	head: () => ({
		...NOINDEX,
		meta: [{ title: "Create your workspace · OpenProfit" }, ...NOINDEX.meta],
	}),
	// Set by /login for new accounts: the page they were signing in for.
	validateSearch: z.object({
		redirect: z.string().refine(isLocalPath).optional().catch(undefined),
	}),
	loader: async () => {
		const [user, analytics] = await Promise.all([
			getSession(),
			getAnalyticsConfig(),
		]);
		if (!user) throw redirect({ to: "/login" });
		// The answer only goes to PostHog, so self-hosts without it don't ask.
		return { user, askHeardFrom: analytics.key !== null };
	},
	component: Onboarding,
});

function Onboarding() {
	const { user, askHeardFrom } = Route.useLoaderData();
	useEffect(() => identify(user.id, user.analytics), [user]);
	const back = Route.useSearch().redirect;
	const navigate = useNavigate();
	const create = useServerFn(createWorkspaceFn);
	const [name, setName] = useState("");
	const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("USD");
	const [incorporated, setIncorporated] = useState(false);
	const [incorporatedOn, setIncorporatedOn] = useState("");
	const [heardFrom, setHeardFrom] = useState<(typeof HEARD_FROM)[number] | "">(
		"",
	);
	const [busy, setBusy] = useState(false);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		await create({
			data: {
				name,
				currency,
				timezone,
				incorporatedOn: incorporated ? incorporatedOn : null,
				heardFrom: heardFrom || undefined,
			},
		});
		if (back) navigate({ href: back });
		else navigate({ to: "/app/connections" });
	}

	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4">
			<Logo size={20} />
			<h1 className="mt-6 text-[20px]">Create your workspace</h1>
			<form
				onSubmit={submit}
				className="mt-6 w-full max-w-[360px] rounded-xl border border-line bg-card p-6"
			>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="ws-name">Workspace name</FieldLabel>
						<Input
							id="ws-name"
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Acme Labs"
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="ws-currency">Base currency</FieldLabel>
						<NativeSelect
							id="ws-currency"
							value={currency}
							onChange={(e) =>
								setCurrency(e.target.value as (typeof CURRENCIES)[number])
							}
						>
							{CURRENCIES.map((c) => (
								<NativeSelectOption key={c} value={c}>
									{c}
								</NativeSelectOption>
							))}
						</NativeSelect>
						<FieldDescription>
							Every amount converts to this currency at the European Central
							Bank rate for its day. You can change it in Settings.
						</FieldDescription>
					</Field>
					<Field>
						<Label>
							<Checkbox
								checked={incorporated}
								onCheckedChange={setIncorporated}
							/>
							This is an incorporated company
						</Label>
						<FieldDescription className="pl-6">
							Check this if your company files its own tax return. You can
							change it in Books.
						</FieldDescription>
					</Field>
					{incorporated && (
						<Field>
							<FieldLabel htmlFor="ws-incorporated">Incorporated on</FieldLabel>
							<Input
								id="ws-incorporated"
								type="date"
								required
								max={localDay()}
								value={incorporatedOn}
								onChange={(e) => setIncorporatedOn(e.target.value)}
								className="num"
							/>
							<FieldDescription>
								Sales and costs before this date count as your own.
							</FieldDescription>
						</Field>
					)}
					{askHeardFrom && (
						<Field>
							<FieldLabel htmlFor="ws-heard-from">
								Where did you hear about OpenProfit?
							</FieldLabel>
							<NativeSelect
								id="ws-heard-from"
								value={heardFrom}
								onChange={(e) =>
									setHeardFrom(e.target.value as (typeof HEARD_FROM)[number])
								}
							>
								<NativeSelectOption value="">
									Choose one (optional)
								</NativeSelectOption>
								{HEARD_FROM.map((k) => (
									<NativeSelectOption key={k} value={k}>
										{HEARD_FROM_LABELS[k]}
									</NativeSelectOption>
								))}
							</NativeSelect>
						</Field>
					)}
					<Button
						type="submit"
						size="default"
						weight="medium"
						className="w-full"
					>
						{busy ? "Creating…" : "Create workspace"}
					</Button>
				</FieldGroup>
			</form>
		</main>
	);
}
