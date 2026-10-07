-- Sub-units no longer fall back to their connection's product: each one is
-- assigned to a product or it's unassigned. Sub-units that followed their
-- connection's product get that product as an explicit mapping, so no line
-- changes product.
INSERT INTO "product_mappings" ("id", "workspace_id", "connection_id", "sub_unit_id", "sub_unit_label", "product_id")
SELECT gen_random_uuid()::text, c."workspace_id", c."id", u."sub_unit_id", u."label", c."product_id"
FROM "connections" c
JOIN (
	SELECT "connection_id", "sub_unit_id", max("sub_unit_label") AS "label" FROM "cost_lines" WHERE "sub_unit_id" IS NOT NULL GROUP BY 1, 2
	UNION
	SELECT "connection_id", "sub_unit_id", max("sub_unit_label") AS "label" FROM "revenue_lines" WHERE "sub_unit_id" IS NOT NULL GROUP BY 1, 2
) u ON u."connection_id" = c."id"
WHERE c."product_id" IS NOT NULL
ON CONFLICT ("connection_id", "sub_unit_id") DO NOTHING;
