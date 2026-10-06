import { APP_NAME } from "#/lib/app";

// Wordmark: medium weight, tight tracking. The mark (an O with a quarter
// cut out) lives in public/favicon.svg and is never set next to the wordmark.
export function Logo({
	size = 17,
	className = "",
}: {
	size?: number;
	className?: string;
}) {
	return (
		<span
			className={`inline-flex items-center font-medium tracking-[-0.02em] text-ink ${className}`}
			style={{ fontSize: size }}
		>
			{APP_NAME}
		</span>
	);
}
