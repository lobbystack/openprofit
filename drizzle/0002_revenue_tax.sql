ALTER TABLE "revenue_lines" ADD COLUMN "tax_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "revenue_lines" ADD COLUMN "tax_base_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Stripe revenue included tax; the others now report it. A null last sync
-- makes the next scheduled run reread the plan's whole history.
UPDATE "connections" SET "last_synced_at" = NULL WHERE "provider" IN ('stripe', 'paddle', 'lemonsqueezy', 'revenuecat');
