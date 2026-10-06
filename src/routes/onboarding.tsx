import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Logo } from "#/components/logo";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { identify } from "#/lib/analytics";
import { NOINDEX } from "#/lib/app";
import { CURRENCIES } from "#/lib/format";
import { getSession } from "#/server/auth.functions";
import { createWorkspaceFn } from "#/server/onboarding.functions";

export const Route = createFileRoute("/onboarding")({
	head: () => ({
		...NOINDEX,
		meta: [{ title: "Create your workspace · OpenProfit" }, ...NOINDEX.meta],
	}),
	loader: async () => {
		const user = await getSession();
		if (!user) throw redirect({ to: "/login" });
		return user;
	},
	component: Onboarding,
});

function Onboarding() {
	const user = Route.useLoaderData();
	useEffect(() => identify(user.id, user.analytics), [user]);
	const navigate = useNavigate();
	const create = useServerFn(createWorkspaceFn);
	const [name, setName] = useState("");
	const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("USD");
	const [busy, setBusy] = useState(false);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		await create({ data: { name, currency, timezone } });
		navigate({ to: "/app/connections" });
	}

	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4">
			<Logo size={20} />
			<h1 className="mt-6 text-[20px]">Create your workspace</h1>
			<form
				onSubmit={submit}
				className="mt-6 w-full max-w-[360px] space-y-4 rounded-xl border border-line bg-card p-6"
			>
				<label className="block">
					<span className="label-mono">Workspace name</span>
					<Input
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Acme Labs"
						className="mt-2"
					/>
				</label>
				<label className="block">
					<span className="label-mono">Base currency</span>
					<NativeSelect
						value={currency}
						onChange={(e) =>
							setCurrency(e.target.value as (typeof CURRENCIES)[number])
						}
						className="mt-2"
					>
						{CURRENCIES.map((c) => (
							<NativeSelectOption key={c} value={c}>
								{c}
							</NativeSelectOption>
						))}
					</NativeSelect>
					<span className="mt-2 block text-[12px] text-text-2">
						Every amount converts to this currency at the European Central Bank
						rate for its day. You can change it in Settings.
					</span>
				</label>
				<Button type="submit" size="default" weight="medium" className="w-full">
					{busy ? "Creating…" : "Create workspace"}
				</Button>
			</form>
		</main>
	);
}
