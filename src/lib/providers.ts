// Providers the app knows, for names, kinds and which have a dark logo.
// Plain module so server code can use the names without the logo component.

export type Provider = {
	name: string;
	kind: "revenue" | "cost";
	v1: boolean;
	// Has a separate white variant at /logos/<id>-dark.svg for dark mode.
	dark?: true;
};

// Logo files live in public/logos; sources and licenses in public/logos/SOURCES.md.
export const PROVIDERS: Record<string, Provider> = {
	stripe: { name: "Stripe", kind: "revenue", v1: true },
	polar: { name: "Polar", kind: "revenue", v1: true, dark: true },
	paddle: { name: "Paddle", kind: "revenue", v1: true },
	lemonsqueezy: { name: "Lemon Squeezy", kind: "revenue", v1: true },
	revenuecat: { name: "RevenueCat", kind: "revenue", v1: true },
	appstore: { name: "App Store", kind: "revenue", v1: false },
	googleplay: { name: "Google Play", kind: "revenue", v1: false },
	openai: { name: "OpenAI", kind: "cost", v1: true, dark: true },
	anthropic: { name: "Anthropic", kind: "cost", v1: true, dark: true },
	openrouter: { name: "OpenRouter", kind: "cost", v1: true, dark: true },
	vercel: { name: "Vercel", kind: "cost", v1: true, dark: true },
	cloudflare: { name: "Cloudflare", kind: "cost", v1: true },
	railway: { name: "Railway", kind: "cost", v1: true, dark: true },
	supabase: { name: "Supabase", kind: "cost", v1: false },
	resend: { name: "Resend", kind: "cost", v1: true, dark: true },
	github: { name: "GitHub", kind: "cost", v1: true, dark: true },
	digitalocean: { name: "DigitalOcean", kind: "cost", v1: true },
	twilio: { name: "Twilio", kind: "cost", v1: true },
	firecrawl: { name: "Firecrawl", kind: "cost", v1: true },
	xai: { name: "xAI", kind: "cost", v1: true, dark: true },
	neon: { name: "Neon", kind: "cost", v1: true },
	mongodb: { name: "MongoDB Atlas", kind: "cost", v1: true, dark: true },
};

export type ProviderId = keyof typeof PROVIDERS;
// Display name for a provider id, such as "OpenAI" for "openai".
export const providerName = (id: string) => PROVIDERS[id]?.name ?? id;
