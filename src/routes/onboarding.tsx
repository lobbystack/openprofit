import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "#/components/landing/primitives";
import { Logo } from "#/components/logo";
import { NOINDEX } from "#/lib/app";
import { CURRENCIES } from "#/lib/format";
import { getSession } from "#/server/auth.functions";
import { createWorkspaceFn } from "#/server/onboarding.functions";

export const Route = createFileRoute("/onboarding")({
	head: () => ({
		...NOINDEX,
		meta: [{ title: "OpenProfit" }, ...NOINDEX.meta],
	}),
	loader: async () => {
		const user = await getSession();
		if (!user) throw redirect({ to: "/login" });
		return user;
	},
	component: Onboarding,
});

function Onboarding() {
	const navigate = useNavigate();
	const create = useServerFn(createWorkspaceFn);
	const [name, setName] = useState("");
	const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("USD");
	const [busy, setBusy] = useState(false);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		await create({ data: { name, currency } });
		navigate({ to: "/app/connections" });
	}

	const field =
		"h-9 w-full rounded-md border border-line bg-paper px-3 text-[13px] outline-none placeholder:text-text-3 focus:border-line-strong";

	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4">
			<Logo size={20} />
			<form
				onSubmit={submit}
				className="mt-8 w-full max-w-[360px] space-y-4 rounded-xl border border-line bg-card p-6"
			>
				<label className="block">
					<span className="label-mono">Workspace</span>
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
				</label>
				<Button className="h-9 w-full" size="sm">
					{busy ? "Creating…" : "Continue"}
				</Button>
			</form>
		</main>
	);
}
