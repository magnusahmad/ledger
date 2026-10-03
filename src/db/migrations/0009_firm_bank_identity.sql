DROP INDEX "bank_tx_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "bank_tx_uq" ON "bank_transaction" USING btree ("firm_id","provider","provider_tx_id");
