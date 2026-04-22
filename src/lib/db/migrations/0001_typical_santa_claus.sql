DO $$ BEGIN
 CREATE TYPE "public"."deal_priority" AS ENUM('alta', 'media', 'baixa');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "priority" "deal_priority" DEFAULT 'media' NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "assigned_agent_id" integer;
