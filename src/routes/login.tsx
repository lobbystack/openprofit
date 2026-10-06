import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { siGithub } from "simple-icons";
import { Logo } from "#/components/logo";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { NOINDEX } from "#/lib/app";
import { authClient } from "#/lib/auth-client";
import { getAuthOptions, getSession } from "#/server/auth.functions";

export const Route = createFileRoute("/login")({
	head: () => ({
		...NOINDEX,
		meta: [{ title: "Sign in · OpenProfit" }, ...NOINDEX.meta],
	}),
	loader: async () => {
		const user = await getSession();
		if (user) throw redirect({ to: "/app" });
		return getAuthOptions();
	},
	component: Login,
});

function Login() {
	const { social, mailer } = Route.useLoaderData();
	const [email, setEmail] = useState("");
	const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
		"idle",
	);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setState("sending");
		const { error } = await authClient.signIn.magicLink({
			email,
			callbackURL: "/app",
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
			<div className="mt-6 w-full max-w-[360px] rounded-xl border border-line bg-card p-6">
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
					<form onSubmit={submit} className="space-y-3">
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
												callbackURL: "/app",
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
						<Input
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@company.com"
						/>
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
					</form>
				)}
			</div>
		</main>
	);
}
