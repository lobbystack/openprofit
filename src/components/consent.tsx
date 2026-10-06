import { useLoaderData } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { initAnalytics, setConsent } from "#/lib/analytics";

const button =
	"h-8 flex-1 rounded-md border border-line bg-paper text-[13px] hover:border-line-strong";

// Cookie banner for PostHog's cookies and session replay. Shows until the
// visitor picks, and again from the footer's "Cookie settings". Renders
// nothing when PostHog is not configured.
export function Consent() {
	const cfg = useLoaderData({ from: "__root__" });
	const [open, setOpen] = useState(cfg.key !== null && cfg.consent === null);

	useEffect(() => {
		initAnalytics(cfg);
		const onChange = (e: Event) =>
			setOpen((e as CustomEvent<boolean | null>).detail === null);
		window.addEventListener("op:consent", onChange);
		return () => window.removeEventListener("op:consent", onChange);
	}, [cfg]);

	if (!open || !cfg.key) return null;
	return (
		<section
			aria-label="Cookies"
			className="chrome fixed inset-x-4 bottom-4 z-50 rounded-xl border border-line p-4 text-[13px] sm:right-auto sm:w-[340px]"
		>
			<p className="text-text-2">
				May we set cookies to recognize your browser and replay your sessions?
				Replays hide what you type and every amount. If you decline, we still
				count your visit, without cookies.{" "}
				<a href="/cookies" className="text-ink underline underline-offset-2">
					Cookie policy
				</a>
			</p>
			<div className="mt-3 flex gap-2">
				<button
					type="button"
					className={button}
					onClick={() => setConsent(false)}
				>
					Decline
				</button>
				<button
					type="button"
					className={button}
					onClick={() => setConsent(true)}
				>
					Accept
				</button>
			</div>
		</section>
	);
}
