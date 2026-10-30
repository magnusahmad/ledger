CREATE TABLE "mailroom_batch" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"filename" text NOT NULL,
	"sha256" text NOT NULL,
	"storage_key" text NOT NULL,
	"pages" integer,
	"status" text DEFAULT 'new' NOT NULL,
	"error" text,
	"received_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailroom_client" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"name" text NOT NULL,
	"name_zh" text,
	"br_no" text,
	"ird_file_no" text,
	"cr_no" text,
	"mpf_no" text,
	"folder" text NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"language" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailroom_letter" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"seq" integer NOT NULL,
	"page_from" integer NOT NULL,
	"page_to" integer NOT NULL,
	"storage_key" text NOT NULL,
	"sha256" text NOT NULL,
	"read" jsonb,
	"match_kind" text,
	"match_reason" text,
	"candidate_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_id" text,
	"folder" text,
	"file_name" text,
	"email_to" text,
	"email_subject" text,
	"email_body" text,
	"email_lang" text,
	"status" text DEFAULT 'reading' NOT NULL,
	"error" text,
	"corrections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"opened_at" timestamp with time zone,
	"review_ms" integer,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"filed_path" text,
	"draft_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "bank_tx_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "mailroom_batch_sha_uq" ON "mailroom_batch" USING btree ("firm_id","sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "mailroom_letter_seq_uq" ON "mailroom_letter" USING btree ("firm_id","batch_id","seq");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_tx_uq" ON "bank_transaction" USING btree ("firm_id","provider","provider_tx_id");