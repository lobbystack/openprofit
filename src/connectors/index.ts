// Importing a connector module registers it. The UI orders providers by
// PROVIDERS in components/provider-logo.tsx, not by this list.
import "./stripe";
import "./polar";
import "./paddle";
import "./lemonsqueezy";
import "./revenuecat";
import "./openai";
import "./anthropic";
import "./openrouter";
import "./railway";
import "./vercel";
import "./cloudflare";
import "./digitalocean";
import "./github";
import "./twilio";
import "./firecrawl";
import "./resend";
import "./xai";
import "./neon";
import "./mongodb";

export type { ConnectorInfo } from "./registry";
export { connector, connectorInfo, connectors } from "./registry";
