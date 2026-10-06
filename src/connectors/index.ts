// Importing a connector module registers it. The UI orders providers by
// PROVIDERS in components/provider-logo.tsx, not by this list.
import "./stripe";
import "./polar";
import "./openai";
import "./anthropic";
import "./railway";
import "./vercel";
import "./cloudflare";

export type { ConnectorInfo } from "./registry";
export { connector, connectorInfo, connectors } from "./registry";
