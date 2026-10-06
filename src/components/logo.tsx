import { APP_NAME } from "#/lib/app";

// Wordmark: medium weight, tight tracking. `mark` puts the mark (an O with a
// quarter cut out, same as public/favicon.svg) before it; only the landing
// nav uses it. Colors come from the tokens, so it flips with the theme.
export function Logo({
	size = 17,
	mark = false,
	className = "",
}: {
	size?: number;
	mark?: boolean;
	className?: string;
}) {
	return (
		<span
			className={`inline-flex items-center gap-2 font-medium tracking-[-0.02em] text-ink ${className}`}
			style={{ fontSize: size }}
		>
			{mark && (
				<svg
					viewBox="0 0 64 64"
					aria-hidden="true"
					style={{ width: "1.25em", height: "1.25em" }}
				>
					<rect width="64" height="64" rx="14" className="fill-ink" />
					<path
						d="M32 13 A19 19 0 1 0 51 32"
						fill="none"
						strokeWidth="8"
						className="stroke-paper"
					/>
				</svg>
			)}
			{APP_NAME}
		</span>
	);
}
