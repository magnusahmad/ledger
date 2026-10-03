CREATE TABLE "mail_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"source_key" text NOT NULL,
	"provider" text NOT NULL,
	"sender" text NOT NULL,
	"correlation_id" text NOT NULL,
	"payload" text NOT NULL,
	"payload_hash" text NOT NULL,
	"status" text DEFAULT 'prepared' NOT NULL,
	"result" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "execution_token" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "execution_token" text;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "approved_input" text;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "facts_hash" text;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "recovery_error" text;--> statement-breakpoint
CREATE UNIQUE INDEX "mail_delivery_source_uq" ON "mail_delivery" USING btree ("firm_id","source_key");