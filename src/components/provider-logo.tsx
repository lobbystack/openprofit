import {
	siAnthropic,
	siAppstore,
	siCloudflare,
	siDigitalocean,
	siGithub,
	siGoogleplay,
	siLemonsqueezy,
	siOpenrouter,
	siPaddle,
	siRailway,
	siResend,
	siRevenuecat,
	siStripe,
	siSupabase,
	siVercel,
} from "simple-icons";

// Firecrawl is not in simple-icons; a flame drawn by hand.
const FLAME_PATH =
	"M12 1c1 4 7 7 7 13.5a7 7 0 0 1-14 0C5 11 6.5 9 8 7.5c.2 2 1 3.5 2.5 4C10 8 10.5 4 12 1Z";

type Provider = {
	name: string;
	kind: "revenue" | "cost";
	v1: boolean;
	path?: string;
};

// Not in simple-icons; drawn by hand: a ring around four dots.
const TWILIO_PATH =
	"M12 0a12 12 0 1 0 0 24a12 12 0 1 0 0-24zm0 3.2a8.8 8.8 0 1 1 0 17.6a8.8 8.8 0 1 1 0-17.6zM6.6 8.8a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0zm6.4 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0zm-6.4 6.4a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0zm6.4 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0z";

export const PROVIDERS: Record<string, Provider> = {
	stripe: { name: "Stripe", kind: "revenue", v1: true, path: siStripe.path },
	polar: { name: "Polar", kind: "revenue", v1: true },
	paddle: { name: "Paddle", kind: "revenue", v1: true, path: siPaddle.path },
	lemonsqueezy: {
		name: "Lemon Squeezy",
		kind: "revenue",
		v1: true,
		path: siLemonsqueezy.path,
	},
	revenuecat: {
		name: "RevenueCat",
		kind: "revenue",
		v1: true,
		path: siRevenuecat.path,
	},
	appstore: {
		name: "App Store",
		kind: "revenue",
		v1: false,
		path: siAppstore.path,
	},
	googleplay: {
		name: "Google Play",
		kind: "revenue",
		v1: false,
		path: siGoogleplay.path,
	},
	openai: { name: "OpenAI", kind: "cost", v1: true },
	anthropic: {
		name: "Anthropic",
		kind: "cost",
		v1: true,
		path: siAnthropic.path,
	},
	openrouter: {
		name: "OpenRouter",
		kind: "cost",
		v1: true,
		path: siOpenrouter.path,
	},
	vercel: { name: "Vercel", kind: "cost", v1: true, path: siVercel.path },
	cloudflare: {
		name: "Cloudflare",
		kind: "cost",
		v1: true,
		path: siCloudflare.path,
	},
	railway: { name: "Railway", kind: "cost", v1: true, path: siRailway.path },
	supabase: {
		name: "Supabase",
		kind: "cost",
		v1: false,
		path: siSupabase.path,
	},
	resend: { name: "Resend", kind: "cost", v1: true, path: siResend.path },
	github: { name: "GitHub", kind: "cost", v1: true, path: siGithub.path },
	digitalocean: {
		name: "DigitalOcean",
		kind: "cost",
		v1: true,
		path: siDigitalocean.path,
	},
	twilio: { name: "Twilio", kind: "cost", v1: true, path: TWILIO_PATH },
	firecrawl: { name: "Firecrawl", kind: "cost", v1: true, path: FLAME_PATH },
};

export type ProviderId = keyof typeof PROVIDERS;

// OpenAI and Polar are not in simple-icons; drawn by hand.
const OPENAI_PATH =
	"M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6.07 6.07 0 0 0 4.98 4.18a5.98 5.98 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9A5.98 5.98 0 0 0 13.26 24a6.06 6.06 0 0 0 5.77-4.21 5.98 5.98 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.07zm-9.02 12.61a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.8.8 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.58a4.5 4.5 0 0 1-4.49 4.5zm-9.66-4.12a4.47 4.47 0 0 1-.54-3.01l.14.09 4.78 2.76a.77.77 0 0 0 .78 0l5.84-3.37v2.33a.08.08 0 0 1-.03.06L9.74 19.95a4.5 4.5 0 0 1-6.14-1.64zM2.34 7.9a4.49 4.49 0 0 1 2.37-1.97v5.68a.77.77 0 0 0 .39.68l5.81 3.35-2.02 1.17a.08.08 0 0 1-.07 0L4 14.02a4.5 4.5 0 0 1-1.66-6.13zm16.6 3.86-5.83-3.39L15.12 7.2a.08.08 0 0 1 .07 0l4.83 2.79a4.49 4.49 0 0 1-.68 8.1v-5.68a.79.79 0 0 0-.4-.66zm2.01-3.02-.14-.09-4.77-2.78a.78.78 0 0 0-.79 0L9.41 9.23V6.9a.07.07 0 0 1 .03-.06l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66zM8.3 12.86l-2.02-1.16a.08.08 0 0 1-.04-.06V6.07a4.5 4.5 0 0 1 7.38-3.45l-.14.08-4.78 2.76a.8.8 0 0 0-.4.68zm1.1-2.37 2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5z";

export function ProviderLogo({
	id,
	size = 20,
	className,
}: {
	id: ProviderId;
	size?: number;
	className?: string;
}) {
	const p = PROVIDERS[id];
	const path = id === "openai" ? OPENAI_PATH : p.path;
	if (!path) {
		// Wordmark fallback for providers without an icon.
		return (
			<span
				className={className}
				style={{
					fontSize: Math.round(size * 0.55),
					fontWeight: 500,
					letterSpacing: "-0.02em",
					lineHeight: 1,
				}}
			>
				{p.name}
			</span>
		);
	}
	return (
		<svg
			role="img"
			aria-label={p.name}
			viewBox="0 0 24 24"
			width={size}
			height={size}
			className={className}
			fill="currentColor"
		>
			<path d={path} />
		</svg>
	);
}
