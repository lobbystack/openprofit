import { APP_NAME } from "#/lib/app";

// Mark: a rounded square with three rising bars. Wordmark: medium weight,
// tight tracking, so it reads as a logo rather than a nav link.
export function Mark({ size = 22 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			role="img"
			aria-label={APP_NAME}
		>
			<rect width="24" height="24" rx="6" fill="currentColor" />
			<g fill="var(--paper)">
				<rect x="5" y="13" width="3.5" height="6" rx="1" />
				<rect x="10.25" y="9" width="3.5" height="10" rx="1" />
				<rect x="15.5" y="5" width="3.5" height="14" rx="1" />
			</g>
		</svg>
	);
}

export function Logo({
	size = 17,
	className = "",
}: {
	size?: number;
	className?: string;
}) {
	return (
		<span
			className={`inline-flex items-center gap-2 font-medium tracking-[-0.02em] text-ink ${className}`}
			style={{ fontSize: size }}
		>
			<Mark size={Math.round(size * 1.3)} />
			{APP_NAME}
		</span>
	);
}
