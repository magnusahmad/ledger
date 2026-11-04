CREATE TABLE "ar_case" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"kind" text NOT NULL,
	"period_key" text NOT NULL,
	"period_year" integer NOT NULL,
	"due_date" date NOT NULL,
	"stage" text DEFAULT 'due' NOT NULL,
	"started_at_stage" text,
	"return_by" date,
	"registry_check" jsonb,
	"form_source" text,
	"form_document_id" text,
	"form_compare" jsonb,
	"payment_confirmed_by" text,
	"payment_confirmed_at" timestamp with time zone,
	"draft" jsonb,
	"sent_at" timestamp with time zone,
	"combined_with_case_id" text,
	"cdd_outstanding" boolean DEFAULT false NOT NULL,
	"filed_on" date,
	"registered_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ar_case_event" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"case_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ar_case_period_uq" ON "ar_case" USING btree ("firm_id","client_id","period_key");--> statement-breakpoint
CREATE INDEX "ar_case_event_case_idx" ON "ar_case_event" USING btree ("case_id");