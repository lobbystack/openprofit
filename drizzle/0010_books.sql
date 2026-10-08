CREATE TABLE "journal_exports" (
	"workspace_id" text NOT NULL,
	"month" text NOT NULL,
	"entries" jsonb NOT NULL,
	"exported_at" bigint NOT NULL,
	CONSTRAINT "journal_exports_workspace_id_month_pk" PRIMARY KEY("workspace_id","month")
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"connection_id" text NOT NULL,
	"date" text NOT NULL,
	"currency" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"amount_base_cents" integer NOT NULL,
	"external_id" text NOT NULL,
	"created_at" bigint DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "paid_with" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "paid_with_since" text;--> statement-breakpoint
ALTER TABLE "flat_costs" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "flat_costs" ADD COLUMN "paid_with" text DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "flat_costs" ADD COLUMN "paid_with_since" text;--> statement-breakpoint
ALTER TABLE "revenue_lines" ADD COLUMN "gross_base_cents" integer;--> statement-breakpoint
ALTER TABLE "revenue_lines" ADD COLUMN "fees_base_cents" integer;--> statement-breakpoint
ALTER TABLE "revenue_lines" ADD COLUMN "refunds_base_cents" integer;--> statement-breakpoint
ALTER TABLE "revenue_lines" ADD COLUMN "service_start" text;--> statement-breakpoint
ALTER TABLE "revenue_lines" ADD COLUMN "service_end" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "incorporated_on" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "book_accounts" jsonb;--> statement-breakpoint
ALTER TABLE "journal_exports" ADD CONSTRAINT "journal_exports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payouts_conn_ext" ON "payouts" USING btree ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "payouts_ws_date" ON "payouts" USING btree ("workspace_id","date");