import { PROVIDERS, type ProviderId } from "#/lib/providers";

export { PROVIDERS, type ProviderId, providerName } from "#/lib/providers";

// Decorative: callers show the provider name next to the logo.
export function ProviderLogo({
	id,
	size = 20,
	className = "",
}: {
	id: ProviderId;
	size?: number;
	className?: string;
}) {
	const img = (file: string, cls: string) => (
		<img
			src={`/logos/${file}.svg`}
			alt=""
			width={size}
			height={size}
			// Preflight sets img height to auto; pin the box so tall marks stay square.
			style={{ height: size }}
			className={`shrink-0 object-contain ${cls} ${className}`}
		/>
	);
	if (!PROVIDERS[id].dark) return img(id, "");
	return (
		<>
			{img(id, "dark:hidden")}
			{img(`${id}-dark`, "hidden dark:inline-block")}
		</>
	);
}
