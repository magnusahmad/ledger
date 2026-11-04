CREATE TABLE "csa_import" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"backup_taken_at" timestamp with time zone NOT NULL,
	"imported_at" timestamp with time zone NOT NULL,
	"counts" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csa_row" (
	"firm_id" text NOT NULL,
	"import_id" text NOT NULL,
	"entity" text NOT NULL,
	"csa_id" text NOT NULL,
	"company_csa_id" text NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "csa_row_uq" ON "csa_row" USING btree ("firm_id","import_id","entity","csa_id");--> statement-breakpoint
CREATE INDEX "csa_row_company_idx" ON "csa_row" USING btree ("firm_id","company_csa_id");