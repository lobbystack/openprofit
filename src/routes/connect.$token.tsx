import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { ConnectForm } from "#/components/app/connect-form";
import { Logo } from "#/components/logo";
import { Card } from "#/components/ui/card";
import { NOINDEX } from "#/lib/app";
import {
	getConnectLink,
	redeemLink,
	testConnectLink,
} from "#/server/connect.functions";

// One-time link an agent hands out (connect_provider), where the user
// enters a provider key in the browser instead of the chat.
export const Route = createFileRoute("/connect/$token")({
	head: () => ({
		...NOINDEX,
		meta: [{ title: "Connect · OpenProfit" }, ...NOINDEX.meta],
	}),
	validateSearch: z.object({
		product: z.string().max(100).optional().catch(undefined),
	}),
	loader: async ({ params, location }) => {
		const page = await getConnectLink({ data: { token: params.token } });
		if (page.state === "signed-out")
			throw redirect({ to: "/login", search: { redirect: location.href } });
		return page;
	},
	component: ConnectLink,
});

const NOTICES = {
	invalid:
		"This link doesn't work. It may belong to a workspace you're not a member of. Ask your agent for a new one.",
	used: "Links work once, and this one is used up. Ask your agent for a new one.",
	expired: "This link has expired. Ask your agent for a new one.",
};

function ConnectLink() {
	const page = Route.useLoaderData();
	const { token } = Route.useParams();
	const { product } = Route.useSearch();
	const test = useServerFn(testConnectLink);
	const redeem = useServerFn(redeemLink);
	const [connected, setConnected] = useState<string | null>(null);

	let body: React.ReactNode;
	if (connected !== null)
		body = (
			<Card className="mt-6 w-full max-w-[360px] p-6 text-[14px]">
				Connected {connected}. Go back to your agent to continue.
			</Card>
		);
	else if (page.state !== "ready")
		body = (
			<Card className="mt-6 w-full max-w-[360px] p-6 text-[14px]">
				{NOTICES[page.state]}
			</Card>
		);
	else
		body = (
			<div className="w-full max-w-[760px]">
				<p className="mt-2 text-center text-[13px] text-text-2">
					Adds a connection to {page.workspace}. OpenProfit encrypts the key,
					and your agent never sees it.
				</p>
				<ConnectForm
					info={page.info}
					test={(credentials) => test({ data: { token, credentials } })}
					save={async (credentials) => {
						const { label } = await redeem({
							data: { token, credentials, productId: product },
						});
						setConnected(label ?? page.info.name);
					}}
				/>
			</div>
		);

	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
			<Link to="/">
				<Logo size={20} />
			</Link>
			<h1 className="mt-6 text-[20px]">
				{page.state === "ready" ? `Connect ${page.info.name}` : "Connect"}
			</h1>
			{body}
		</main>
	);
}
