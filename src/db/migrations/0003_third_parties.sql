CREATE TABLE "task_party" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"task_id" text NOT NULL,
	"party_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "third_party" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"name" text NOT NULL,
	"organisation" text,
	"email" text,
	"role" text DEFAULT 'other' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "task_party_uq" ON "task_party" USING btree ("task_id","party_id");--> statement-breakpoint
CREATE INDEX "third_party_email_idx" ON "third_party" USING btree ("firm_id","email");