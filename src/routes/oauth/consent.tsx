import { createFileRoute, Link, redirect } from "@tanstack/react-router";
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
import { decideOAuth, getOAuthConsent } from "#/server/oauth.functions";

// Consent for an OAuth client (claude.ai, ChatGPT, Cursor) that wants a
// token for the MCP server. /oauth/authorize checks the request first and
// sends it here encrypted, or sends an error code.
export const Route = createFileRoute("/oauth/consent")({
	head: () => ({
		...NOINDEX,
		meta: [{ title: "Connect an app · OpenProfit" }, ...NOINDEX.meta],
	}),
	validateSearch: z.object({
		request: z.string().max(8000).optional().catch(undefined),
		error: z.enum(["client", "redirect_uri"]).optional().catch(undefined),
	}),
	loaderDeps: ({ search }) => ({ request: search.request }),
	loader: async ({ deps, location }) => {
		if (!deps.request) return null;
		const consent = await getOAuthConsent({ data: { request: deps.request } });
		if (consent.state === "signed-out")
			throw redirect({ to: "/login", search: { redirect: location.href } });
		return consent;
	},
	component: Consent,
});

const ERRORS = {
	client: "OpenProfit couldn't identify the app that sent you here.",
	redirect_uri:
		"The app asked OpenProfit to send you to an address it didn't register.",
};

function Consent() {
	const consent = Route.useLoaderData();
	const { request, error } = Route.useSearch();
	const decide = useServerFn(decideOAuth);
	const ready = consent?.state === "ready" ? consent : null;
	const [workspaceId, setWorkspaceId] = useState(
		ready?.workspaces[0]?.id ?? "",
	);
	const [scope, setScope] = useState<"read" | "write">(ready?.scope ?? "write");
	const [done, setDone] = useState<"approved" | "cancelled" | null>(null);
	const [failure, setFailure] = useState<string | null>(null);

	async function answer(approve: boolean) {
		setFailure(null);
		try {
			const { url } = await decide({
				data: {
					request: request ?? "",
					workspaceId: approve ? workspaceId : null,
					scope,
				},
			});
			setDone(approve ? "approved" : "cancelled");
			window.location.assign(url);
		} catch (err) {
			setFailure(err instanceof Error ? err.message : String(err));
		}
	}

	let title = "Connect an app";
	let body: React.ReactNode;
	if (error || !ready)
		body = (
			<p>
				{error ? ERRORS[error] : "This link has expired or is incomplete."} Add
				OpenProfit again in the app.
			</p>
		);
	else {
		const { client, target, workspaces } = ready;
		title = `Connect ${client.name}`;
		if (done === "approved") body = <p>Approved. Go back to {client.name}.</p>;
		else if (done === "cancelled")
			body = <p>Cancelled. {client.name} didn't get access.</p>;
		else if (!workspaces.length)
			body = (
				<>
					<p>Create a workspace first, then connect again.</p>
					<Link
						to="/onboarding"
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
					<p>
						{client.host ? (
							<>
								{client.name} (<span className="num">{client.host}</span>) asks
								for access to one workspace.
							</>
						) : (
							<>
								An app calling itself {client.name} asks for access to one
								workspace. The app chose that name, and OpenProfit can't confirm
								it.
							</>
						)}
					</p>
					<p className="mt-3 text-text-2">
						{target.local ? (
							<>
								OpenProfit sends the access to an app on this computer (
								<span className="num">{target.host}</span>). Approve only if you
								started this connection from that app.
							</>
						) : (
							<>
								After you approve, you go back to{" "}
								<span className="num">{target.host}</span>. Approve only if you
								started this connection there.
							</>
						)}
					</p>
					{workspaces.length > 1 && (
						<Field className="mt-5">
							<FieldLabel htmlFor="oauth-ws">Workspace</FieldLabel>
							<NativeSelect
								id="oauth-ws"
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
					{ready.scope === "write" && (
						<Field className="mt-4">
							<FieldLabel htmlFor="oauth-scope">Access</FieldLabel>
							<NativeSelect
								id="oauth-scope"
								value={scope}
								onChange={(e) => setScope(e.target.value as "read" | "write")}
							>
								<NativeSelectOption value="write">
									Read and write
								</NativeSelectOption>
								<NativeSelectOption value="read">Read</NativeSelectOption>
							</NativeSelect>
						</Field>
					)}
					<p className="mt-5 text-[12px] text-text-2">
						{scope === "write"
							? `${client.name} can read and change ${workspaces.length > 1 ? "this workspace" : workspaces[0].name}: products, connections, mappings, flat costs and public pages.`
							: `${client.name} can read the numbers, products, connections and alerts of ${workspaces.length > 1 ? "this workspace" : workspaces[0].name}.`}{" "}
						You can revoke access in Settings, under API tokens.
					</p>
					{failure && (
						<p className="mt-3 text-[12px] text-negative">{failure}</p>
					)}
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
	}

	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4">
			<Link to="/">
				<Logo size={20} />
			</Link>
			<h1 className="mt-6 text-[20px]">{title}</h1>
			<Card className="mt-6 w-full max-w-[360px] p-6 text-[14px]">{body}</Card>
		</main>
	);
}
