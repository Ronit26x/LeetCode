CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."problem_status" AS ENUM('backlog', 'active', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."review_mode" AS ENUM('revise', 'resolve');--> statement-breakpoint
CREATE TYPE "public"."snippet_language" AS ENUM('cpp', 'python', 'java', 'text');--> statement-breakpoint
CREATE TYPE "public"."tag_color" AS ENUM('red', 'orange', 'amber', 'lime', 'green', 'teal', 'sky', 'blue', 'indigo', 'violet', 'pink', 'stone');--> statement-breakpoint
CREATE TYPE "public"."tag_kind" AS ENUM('topic', 'pattern', 'company', 'custom');--> statement-breakpoint
CREATE TABLE "cards" (
	"problem_id" uuid PRIMARY KEY NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"stability" double precision DEFAULT 0 NOT NULL,
	"difficulty" double precision DEFAULT 0 NOT NULL,
	"elapsed_days" integer DEFAULT 0 NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"learning_steps" integer DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"state" integer DEFAULT 0 NOT NULL,
	"last_review" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "problem_relations" (
	"problem_id" uuid NOT NULL,
	"related_problem_id" uuid NOT NULL,
	CONSTRAINT "problem_relations_problem_id_related_problem_id_pk" PRIMARY KEY("problem_id","related_problem_id")
);
--> statement-breakpoint
CREATE TABLE "problem_tags" (
	"problem_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "problem_tags_problem_id_tag_id_pk" PRIMARY KEY("problem_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leetcode_number" integer,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"difficulty" "difficulty" DEFAULT 'medium' NOT NULL,
	"status" "problem_status" DEFAULT 'backlog' NOT NULL,
	"prompt_summary" text DEFAULT '' NOT NULL,
	"key_insight" text DEFAULT '' NOT NULL,
	"approach" text DEFAULT '' NOT NULL,
	"time_complexity" text DEFAULT '' NOT NULL,
	"space_complexity" text DEFAULT '' NOT NULL,
	"pitfalls" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"revise_count" integer DEFAULT 0 NOT NULL,
	"resolve_count" integer DEFAULT 0 NOT NULL,
	"last_mode" "review_mode",
	"first_solved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_days" (
	"review_day" date PRIMARY KEY NOT NULL,
	"problem_ids" uuid[] NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_review_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"mode" "review_mode" NOT NULL,
	"rating" integer NOT NULL,
	"duration_seconds" integer,
	"note" text,
	"reviewed_at" timestamp with time zone NOT NULL,
	"undone_at" timestamp with time zone,
	"state" integer NOT NULL,
	"due" timestamp with time zone NOT NULL,
	"stability" double precision NOT NULL,
	"difficulty" double precision NOT NULL,
	"elapsed_days" integer NOT NULL,
	"last_elapsed_days" integer NOT NULL,
	"scheduled_days" integer NOT NULL,
	"learning_steps" integer NOT NULL,
	"result_scheduled_days" integer DEFAULT 0 NOT NULL,
	"prev_due" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_logs_rating_check" CHECK ("review_logs"."rating" between 0 and 4)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"timezone" text DEFAULT 'America/Los_Angeles' NOT NULL,
	"day_start_hour" integer DEFAULT 9 NOT NULL,
	"desired_retention" double precision DEFAULT 0.9 NOT NULL,
	"maximum_interval" integer DEFAULT 365 NOT NULL,
	"fsrs_params" jsonb NOT NULL,
	"interview_date" date,
	"retention_ramp_enabled" boolean DEFAULT true NOT NULL,
	"retention_ramp_days" integer DEFAULT 14 NOT NULL,
	"retention_ramp_target" double precision DEFAULT 0.95 NOT NULL,
	"cram_window_days" integer DEFAULT 7 NOT NULL,
	"allow_easy_in_revise" boolean DEFAULT false NOT NULL,
	"resolve_milestones_days" jsonb NOT NULL,
	"resolve_after_n_revises" integer DEFAULT 3 NOT NULL,
	"resolve_time_targets_min" jsonb NOT NULL,
	"revise_time_estimate_min" integer DEFAULT 3 NOT NULL,
	"daily_soft_cap" integer,
	"last_ramp_applied_day" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "snippets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem_id" uuid NOT NULL,
	"label" text DEFAULT 'Optimal' NOT NULL,
	"language" "snippet_language" DEFAULT 'cpp' NOT NULL,
	"code" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" "tag_color" DEFAULT 'stone' NOT NULL,
	"kind" "tag_kind" DEFAULT 'custom' NOT NULL,
	"always_resolve" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_relations" ADD CONSTRAINT "problem_relations_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_relations" ADD CONSTRAINT "problem_relations_related_problem_id_problems_id_fk" FOREIGN KEY ("related_problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_tags" ADD CONSTRAINT "problem_tags_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_tags" ADD CONSTRAINT "problem_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippets" ADD CONSTRAINT "snippets_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_due_idx" ON "cards" USING btree ("due");--> statement-breakpoint
CREATE INDEX "cards_state_idx" ON "cards" USING btree ("state");--> statement-breakpoint
CREATE INDEX "problem_relations_related_idx" ON "problem_relations" USING btree ("related_problem_id");--> statement-breakpoint
CREATE INDEX "problem_tags_tag_idx" ON "problem_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "problems_slug_idx" ON "problems" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "problems_status_idx" ON "problems" USING btree ("status");--> statement-breakpoint
CREATE INDEX "problems_number_idx" ON "problems" USING btree ("leetcode_number");--> statement-breakpoint
CREATE INDEX "problems_title_idx" ON "problems" USING btree ("title");--> statement-breakpoint
CREATE UNIQUE INDEX "review_logs_client_idx" ON "review_logs" USING btree ("client_review_id");--> statement-breakpoint
CREATE INDEX "review_logs_problem_idx" ON "review_logs" USING btree ("problem_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "review_logs_reviewed_idx" ON "review_logs" USING btree ("reviewed_at");--> statement-breakpoint
CREATE INDEX "snippets_problem_idx" ON "snippets" USING btree ("problem_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_lower_idx" ON "tags" USING btree (lower("name"));