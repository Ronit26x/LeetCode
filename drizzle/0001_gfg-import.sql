CREATE TYPE "public"."problem_source" AS ENUM('leetcode', 'gfg', 'other');--> statement-breakpoint
CREATE TYPE "public"."problem_tier" AS ENUM('core', 'warmup', 'skip');--> statement-breakpoint
CREATE TYPE "public"."solve_precision" AS ENUM('day', 'month', 'year');--> statement-breakpoint
DROP INDEX "problems_slug_idx";--> statement-breakpoint
ALTER TABLE "problem_tags" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "source" "problem_source" DEFAULT 'leetcode' NOT NULL;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "prior_solved_at" date;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "prior_solved_precision" "solve_precision";--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "tier" "problem_tier";--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "import_batch" text;--> statement-breakpoint
CREATE UNIQUE INDEX "problems_source_slug_idx" ON "problems" USING btree ("source","slug");--> statement-breakpoint
CREATE INDEX "problems_tier_idx" ON "problems" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "problems_import_batch_idx" ON "problems" USING btree ("import_batch");--> statement-breakpoint
CREATE INDEX "problems_slug_idx" ON "problems" USING btree ("slug");