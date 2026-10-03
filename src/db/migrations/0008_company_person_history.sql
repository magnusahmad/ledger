CREATE TABLE "register_person_change" (
	"id" text PRIMARY KEY NOT NULL,
	"sequence" bigint GENERATED ALWAYS AS IDENTITY (sequence name "register_person_change_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"person_id" text NOT NULL,
	"from_date" date NOT NULL,
	"patch" jsonb NOT NULL,
	"source_task_id" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "register_person_baseline_uq" ON "register_person_change" USING btree ("firm_id","client_id","person_id") WHERE "register_person_change"."source_task_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "register_person_task_uq" ON "register_person_change" USING btree ("firm_id","person_id","source_task_id");--> statement-breakpoint
CREATE INDEX "register_person_date_idx" ON "register_person_change" USING btree ("firm_id","client_id","person_id","from_date");
--> statement-breakpoint
-- Preserve the currently known particulars at upgrade. Earlier overwritten
-- values cannot be reconstructed and are not invented by this baseline.
WITH refs AS (
  SELECT firm_id, client_id, person_id FROM appointment
  UNION SELECT firm_id, client_id, person_id FROM significant_controller
  UNION SELECT firm_id, client_id, from_person_id FROM share_movement WHERE from_person_id IS NOT NULL
  UNION SELECT firm_id, client_id, to_person_id FROM share_movement WHERE to_person_id IS NOT NULL
)
INSERT INTO register_person_change (id, firm_id, client_id, person_id, from_date, patch, source_task_id)
SELECT 'rpc_baseline_' || md5(concat_ws(':', p.firm_id, r.client_id, p.id)),
       p.firm_id, r.client_id, p.id, '0001-01-01',
       jsonb_build_object('kind', p.kind, 'nameEn', p.name_en, 'nameZh', p.name_zh,
         'idType', p.id_type, 'idNumberEnc', p.id_number_enc, 'idCountry', p.id_country,
         'dateOfBirth', p.date_of_birth, 'nationality', p.nationality,
         'residentialAddressEnc', p.residential_address_enc,
         'correspondenceAddress', p.correspondence_address, 'email', p.email, 'phone', p.phone),
       NULL
FROM refs r
JOIN person p ON p.id = r.person_id AND p.firm_id = r.firm_id
JOIN client c ON c.id = r.client_id AND c.firm_id = r.firm_id
ON CONFLICT DO NOTHING;
