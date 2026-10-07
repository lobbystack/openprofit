import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { siGithub } from "simple-icons";
import { z } from "zod";
import { Logo } from "#/components/logo";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { NOINDEX } from "#/lib/app";
import { authClient } from "#/lib/auth-client";
import { getAuthOptions, getSession } from "#/server/auth.functions";

export const Route = createFileRoute("/login")({
	head: () => ({
		...NOINDEX,
		meta: [{ title: "Sign in · OpenProfit" }, ...NOINDEX.meta],
	}),
	// Where to go after signing in: a path on this site, never another host.
	validateSearch: z.object({
		redirect: z
			.string()
			.regex(/^\/(?![/\\])/)
			.optional()
			.catch(undefined),
	}),
	loaderDeps: ({ search }) => ({ next: search.redirect }),
	loader: async ({ deps }) => {
		const user = await getSession();
		if (user) throw redirect({ href: deps.next ?? "/app" });
		return getAuthOptions();
	},
	component: Login,
});

function Login() {
	const { social, mailer } = Route.useLoaderData();
	const next = Route.useSearch().redirect ?? "/app";
	const [email, setEmail] = useState("");
	const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
		"idle",
	);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setState("sending");
		const { error } = await authClient.signIn.magicLink({
			email,
			callbackURL: next,
			newUserCallbackURL: "/onboarding",
		});
		setState(error ? "error" : "sent");
	}

	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4">
			<Link to="/">
				<Logo size={20} />
			</Link>
			<h1 className="mt-6 text-[20px]">Sign in or create an account</h1>
			<Card className="mt-6 w-full max-w-[360px] p-6">
				{state === "sent" ? (
					mailer ? (
						<p className="text-[14px]">
							Check <span className="num">{email}</span> for a sign-in link. It
							expires in 5 minutes.
						</p>
					) : (
						<p className="text-[14px]">
							No email provider is set, so the link is in the server log. Open
							it in this browser.
						</p>
					)
				) : (
					<form onSubmit={submit}>
						<FieldGroup className="gap-3">
							{social.length > 0 && (
								<>
									{social.map((p) => (
										<Button
											key={p}
											variant="outline"
											size="default"
											className="w-full"
											onClick={() =>
												authClient.signIn.social({
													provider: p as "github" | "google",
													callbackURL: next,
													newUserCallbackURL: "/onboarding",
												})
											}
										>
											{p === "github" && (
												<svg
													viewBox="0 0 24 24"
													width="14"
													height="14"
													fill="currentColor"
													role="img"
													aria-label="GitHub"
												>
													<path d={siGithub.path} />
												</svg>
											)}
											{p === "github"
												? "Continue with GitHub"
												: "Continue with Google"}
										</Button>
									))}
									<div className="label-mono py-1 text-center">or</div>
								</>
							)}
							<Field>
								<FieldLabel htmlFor="email" className="sr-only">
									Email
								</FieldLabel>
								<Input
									id="email"
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="you@company.com"
								/>
							</Field>
							<Button
								type="submit"
								size="default"
								weight="medium"
								className="w-full"
							>
								{state === "sending" ? "Sending…" : "Email me a link"}
							</Button>
							{state === "error" && (
								<p className="text-[12px] text-negative">
									Could not send the link. Try again.
								</p>
							)}
						</FieldGroup>
					</form>
				)}
			</Card>
		</main>
	);
}
