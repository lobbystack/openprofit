-- Reread the plan's whole history on the next scheduled sync for:
-- Stripe and Paddle, whose payouts and service periods are new (0010), and
-- every connection in a CAD workspace, so its stored lines convert at the
-- Bank of Canada rates (0011).
-- 1, not null: a last sync that old makes syncRange read the whole history,
-- while null would count as a first sync, which maps unassigned sub-units to
-- the connection's product and records first-sync analytics again.
-- Connections that never synced keep null.
UPDATE "connections" SET "last_synced_at" = 1
WHERE "last_synced_at" IS NOT NULL
	AND (
		"provider" IN ('stripe', 'paddle')
		OR "workspace_id" IN (SELECT "id" FROM "workspaces" WHERE "base_currency" = 'CAD')
	);
