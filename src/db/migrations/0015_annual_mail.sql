CREATE TABLE "ar_mail" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"case_id" text,
	"status" text NOT NULL,
	"candidate_case_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"via" text,
	"mailbox" text NOT NULL,
	"graph_id" text NOT NULL,
	"folder" text NOT NULL,
	"direction" text NOT NULL,
	"conversation_id" text,
	"internet_message_id" text,
	"from_addr" text NOT NULL,
	"from_name" text,
	"to_addrs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cc_addrs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subject" text NOT NULL,
	"text" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"linked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ar_mail_scan" (
	"firm_id" text NOT NULL,
	"day" date NOT NULL,
	"mailbox" text NOT NULL,
	"scanned" integer DEFAULT 0 NOT NULL,
	"linked" integer DEFAULT 0 NOT NULL,
	"ask" integer DEFAULT 0 NOT NULL,
	"skipped" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ar_mail_graph_uq" ON "ar_mail" USING btree ("firm_id","mailbox","graph_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_mail_rfc_uq" ON "ar_mail" USING btree ("firm_id","internet_message_id");--> statement-breakpoint
CREATE INDEX "ar_mail_case_idx" ON "ar_mail" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_mail_scan_uq" ON "ar_mail_scan" USING btree ("firm_id","day","mailbox");