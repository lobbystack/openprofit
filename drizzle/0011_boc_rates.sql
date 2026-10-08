-- Conversions into Canadian dollars now use Bank of Canada rates
-- (src/server/fx.server.ts). Drop the cached ECB rates into CAD so the next
-- conversions fetch them. Stored lines keep their base amounts until a full sync.
DELETE FROM "fx_rates" WHERE "currency" = 'CAD';
