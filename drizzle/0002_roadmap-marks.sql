CREATE TYPE "public"."roadmap_mark_status" AS ENUM('done', 'redo');--> statement-breakpoint
CREATE TABLE "roadmap_marks" (
	"problem_number" integer PRIMARY KEY NOT NULL,
	"status" "roadmap_mark_status" NOT NULL,
	"done_on" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
