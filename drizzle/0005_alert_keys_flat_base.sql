ALTER TABLE "alerts" ADD COLUMN "key" text;--> statement-breakpoint
ALTER TABLE "flat_costs" ADD COLUMN "amount_base_cents" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "alerts_ws_open_key" ON "alerts" USING btree ("workspace_id","key") WHERE "alerts"."resolved_at" is null;