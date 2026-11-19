CREATE TABLE "ai_defect" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"task" text NOT NULL,
	"kind" text NOT NULL,
	"input_ref" text NOT NULL,
	"item_id" text,
	"case_id" text,
	"model_output" jsonb,
	"final_value" jsonb,
	"model" text,
	"prompt_version" text,
	"by" text NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ar_reply" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"mail_id" text NOT NULL,
	"case_id" text NOT NULL,
	"status" text NOT NULL,
	"about" text,
	"summary" text,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text,
	"prompt_version" text NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"error" text,
	"read_at" timestamp with time zone NOT NULL,
	"opens" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ar_reply_item" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"reply_id" text NOT NULL,
	"case_id" text NOT NULL,
	"mail_id" text NOT NULL,
	"kind" text NOT NULL,
	"origin" text NOT NULL,
	"proposed" jsonb,
	"final" jsonb,
	"status" text DEFAULT 'proposed' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"resolution" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ar_case" ADD COLUMN "charges_answer" jsonb;--> statement-breakpoint
CREATE INDEX "ai_defect_task_idx" ON "ai_defect" USING btree ("firm_id","task","at");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_reply_mail_uq" ON "ar_reply" USING btree ("firm_id","mail_id");--> statement-breakpoint
CREATE INDEX "ar_reply_case_idx" ON "ar_reply" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "ar_reply_item_reply_idx" ON "ar_reply_item" USING btree ("reply_id");--> statement-breakpoint
CREATE INDEX "ar_reply_item_case_idx" ON "ar_reply_item" USING btree ("case_id");