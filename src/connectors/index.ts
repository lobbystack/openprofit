// Importing a connector module registers it. Keep this list in the order
// users should see providers.
import "./stripe";
import "./polar";
import "./openai";
import "./anthropic";
import "./railway";
import "./vercel";
import "./cloudflare";

export type { ConnectorInfo } from "./registry";
export { connector, connectorInfo, connectors } from "./registry";
