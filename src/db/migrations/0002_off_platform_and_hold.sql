CREATE TABLE "task_action" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"task_id" text NOT NULL,
	"title" text NOT NULL,
	"waiting_on" text NOT NULL,
	"owner_id" text,
	"party_id" text,
	"due_date" date,
	"follow_up_on" date,
	"before_step" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"proof_note" text,
	"proof_reference" text,
	"proof_document_id" text,
	"completed_by" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "hold_reason" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "hold_waiting_on" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "hold_party_id" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "hold_since" date;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "hold_follow_up_on" date;--> statement-breakpoint
CREATE INDEX "task_action_task_idx" ON "task_action" USING btree ("task_id");