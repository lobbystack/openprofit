import { APP_NAME } from "#/lib/app";

// Wordmark: medium weight, tight tracking. `mark` puts the mark (the O with a
// quarter cut out from public/favicon.svg, without its square) before it;
// only the landing nav uses it. It takes the ink token, so it flips with the
// theme.
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
					viewBox="9 9 46 46"
					aria-hidden="true"
					style={{ width: "1.1em", height: "1.1em" }}
				>
					<path
						d="M32 13 A19 19 0 1 0 51 32"
						fill="none"
						strokeWidth="8"
						className="stroke-ink"
					/>
				</svg>
			)}
			{APP_NAME}
		</span>
	);
}
