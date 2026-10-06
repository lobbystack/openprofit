ALTER TABLE "workspaces" ADD COLUMN "weekly_day" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "weekly_hour" integer DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "weekly_sent_at" bigint;