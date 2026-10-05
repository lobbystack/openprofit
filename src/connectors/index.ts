// Importing a connector module registers it. Keep this list in the order
// users should see providers.

export type { ConnectorInfo } from "./registry";
export { connector, connectorInfo, connectors } from "./registry";
