import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { siGithub } from "simple-icons";
import { Button } from "#/components/landing/primitives";
import { APP_NAME } from "#/lib/app";
import { authClient } from "#/lib/auth-client";
import { getAuthOptions, getSession } from "#/server/auth.functions";

export const Route = createFileRoute("/login")({
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
			<a href="/" className="text-[15px]">
				{APP_NAME}
			</a>
			<div className="mt-8 w-full max-w-[360px] rounded-xl border border-line bg-card p-6">
				{state === "sent" ? (
					mailer ? (
						<p className="text-[14px]">
							Check <span className="num">{email}</span> for a sign-in link.
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
									<button
										key={p}
										type="button"
										onClick={() =>
											authClient.signIn.social({
												provider: p as "github" | "google",
												callbackURL: "/app",
												newUserCallbackURL: "/onboarding",
											})
										}
										className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-line bg-paper text-[13px] hover:border-line-strong"
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
										{p === "github" ? "GitHub" : "Google"}
									</button>
								))}
								<div className="label-mono py-1 text-center">or</div>
							</>
						)}
						<input
							type="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@company.com"
							className="h-9 w-full rounded-md border border-line bg-paper px-3 text-[13px] outline-none placeholder:text-text-3 focus:border-line-strong"
						/>
						<Button className="h-9 w-full" size="sm">
							{state === "sending" ? "Sending" : "Email me a link"}
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
