import {
	type ErrorComponentProps,
	Link,
	useLocation,
	useRouter,
} from "@tanstack/react-router";

const button =
	"pressable inline-flex h-8 items-center justify-center rounded-md px-3 text-[13px] font-medium";
const primary = `${button} bg-ink text-paper hover:bg-ink-2`;
const secondary = `${button} border border-line bg-paper text-ink hover:border-line-strong`;

function Status({
	title,
	text,
	detail,
	children,
}: {
	title: string;
	text: string;
	detail?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="mx-auto flex w-full max-w-[400px] flex-col items-center px-4 py-32 text-center">
			<h1 className="text-[20px]">{title}</h1>
			<p className="mt-2 text-[14px] text-text-2">{text}</p>
			<div className="mt-6 flex gap-2">{children}</div>
			{detail && (
				<pre className="mt-6 w-full overflow-auto text-left text-[12px] text-negative">
					{detail}
				</pre>
			)}
		</div>
	);
}

export function NotFound() {
	const inApp = useLocation({
		select: (l) => /^\/app(\/|$)/.test(l.pathname),
	});
	return (
		<Status
			title="Page not found"
			text={
				inApp
					? "Check the address or go back to the overview."
					: "Check the address or start from the home page."
			}
		>
			<Link to={inApp ? "/app" : "/"} className={primary}>
				{inApp ? "Overview" : "Home"}
			</Link>
		</Status>
	);
}

// After a deploy, an open tab can ask for code that no longer exists and
// land here; a full reload fetches the new version.
export function ErrorPage({ error }: ErrorComponentProps) {
	const router = useRouter();
	return (
		<Status
			title="This page didn't load"
			text="Reload to get the latest version, or try the request again."
			// Error text can hold internals; only development shows it.
			detail={
				import.meta.env.DEV && error instanceof Error
					? error.message
					: undefined
			}
		>
			<button
				type="button"
				className={primary}
				onClick={() => window.location.reload()}
			>
				Reload
			</button>
			<button
				type="button"
				className={secondary}
				onClick={() => router.invalidate()}
			>
				Try again
			</button>
		</Status>
	);
}
