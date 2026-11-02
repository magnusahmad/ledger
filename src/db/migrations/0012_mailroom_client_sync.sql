ALTER TABLE "mailroom_client" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "mailroom_client" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "mailroom_client" ADD COLUMN "conflicts" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "mailroom_client_code_uq" ON "mailroom_client" USING btree ("firm_id","code");