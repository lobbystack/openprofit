import {
	createFileRoute,
	Link,
	redirect,
	useLocation,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Logo } from "#/components/logo";
import { Button, buttonVariants } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Field, FieldLabel } from "#/components/ui/field";
import {
	NativeSelect,
	NativeSelectOption,
} from "#/components/ui/native-select";
import { NOINDEX } from "#/lib/app";
import { decideCli, getCliLogin } from "#/server/tokens.functions";

// Approves `npx openprofit login` in the browser.
export const Route = createFileRoute("/cli")({
	head: () => ({
		...NOINDEX,
		meta: [{ title: "Approve CLI sign-in · OpenProfit" }, ...NOINDEX.meta],
	}),
	validateSearch: z.object({
		code: z.string().max(20).optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => ({ code: search.code }),
	loader: async ({ deps, location }) => {
		const login = await getCliLogin({ data: { code: deps.code ?? "" } });
		if (!login)
			throw redirect({ to: "/login", search: { redirect: location.href } });
		return login;
	},
	component: Cli,
});

function Cli() {
	const { state, workspaces } = Route.useLoaderData();
	const { code } = Route.useSearch();
	const decide = useServerFn(decideCli);
	const here = useLocation({ select: (l) => l.href });
	const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? "");
	const [done, setDone] = useState<"approved" | "cancelled" | null>(
		state === "approved" ? "approved" : null,
	);
	const [error, setError] = useState<string | null>(null);

	async function answer(approve: boolean) {
		setError(null);
		try {
			await decide({
				data: { code: code ?? "", workspaceId: approve ? workspaceId : null },
			});
			setDone(approve ? "approved" : "cancelled");
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	let body: React.ReactNode;
	if (done === "approved") body = <p>Approved. Go back to your terminal.</p>;
	else if (done === "cancelled")
		body = <p>Cancelled. The CLI didn't get a token.</p>;
	else if (!code || state === "expired")
		body = (
			<p>
				This code has expired. Run{" "}
				<span className="num">npx openprofit login</span> again.
			</p>
		);
	else if (!workspaces.length)
		body = (
			<>
				<p>Create a workspace first, then approve the code here.</p>
				<Link
					to="/onboarding"
					search={{ redirect: here }}
					className={buttonVariants({
						size: "default",
						className: "mt-4 w-full",
					})}
				>
					Create a workspace
				</Link>
			</>
		);
	else
		body = (
			<>
				<p className="text-text-2">
					Check that this code matches the one in your terminal.
				</p>
				<div className="num mt-3 text-center text-[24px] tracking-[0.08em]">
					{code}
				</div>
				{workspaces.length > 1 && (
					<Field className="mt-5">
						<FieldLabel htmlFor="cli-ws">Workspace</FieldLabel>
						<NativeSelect
							id="cli-ws"
							value={workspaceId}
							onChange={(e) => setWorkspaceId(e.target.value)}
						>
							{workspaces.map((w) => (
								<NativeSelectOption key={w.id} value={w.id}>
									{w.name}
								</NativeSelectOption>
							))}
						</NativeSelect>
					</Field>
				)}
				<p className="mt-5 text-[12px] text-text-2">
					The CLI gets a token that can read and change{" "}
					{workspaces.length > 1 ? "this workspace" : workspaces[0].name}. You
					can revoke it in Settings.
				</p>
				{error && <p className="mt-3 text-[12px] text-negative">{error}</p>}
				<div className="mt-5 flex gap-2">
					<Button
						variant="outline"
						size="default"
						className="flex-1"
						onClick={() => answer(false)}
					>
						Cancel
					</Button>
					<Button
						size="default"
						className="flex-1"
						onClick={() => answer(true)}
					>
						Approve
					</Button>
				</div>
			</>
		);

	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4">
			<Link to="/">
				<Logo size={20} />
			</Link>
			<h1 className="mt-6 text-[20px]">Approve CLI sign-in</h1>
			<Card className="mt-6 w-full max-w-[360px] p-6 text-[14px]">{body}</Card>
		</main>
	);
}
