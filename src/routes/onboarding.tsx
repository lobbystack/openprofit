import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "#/components/landing/primitives";
import { Logo } from "#/components/logo";
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

	const field =
		"h-9 w-full rounded-md border border-line bg-paper px-3 text-[13px] outline-none placeholder:text-text-3 focus:border-line-strong";

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
					<input
						required
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Acme Labs"
						className={`${field} mt-2`}
					/>
				</label>
				<label className="block">
					<span className="label-mono">Base currency</span>
					<select
						value={currency}
						onChange={(e) =>
							setCurrency(e.target.value as (typeof CURRENCIES)[number])
						}
						className={`${field} mt-2`}
					>
						{CURRENCIES.map((c) => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</select>
					<span className="mt-2 block text-[12px] text-text-2">
						Every amount converts to this currency at the European Central Bank
						rate for its day. You can change it in Settings.
					</span>
				</label>
				<Button className="h-9 w-full" size="sm">
					{busy ? "Creating…" : "Create workspace"}
				</Button>
			</form>
		</main>
	);
}
