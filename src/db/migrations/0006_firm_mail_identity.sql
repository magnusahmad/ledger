DROP INDEX "message_provider_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "message_provider_uq" ON "message" USING btree ("firm_id","provider","provider_message_id");