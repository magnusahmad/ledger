CREATE TABLE "app_user" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"title" text,
	"email" text,
	"is_demo_user" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"person_id" text NOT NULL,
	"role" text NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date,
	"source_task_id" text,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"message_id" text NOT NULL,
	"document_id" text,
	"filename" text NOT NULL,
	"mime" text,
	"size" integer
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_account" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"bank" text NOT NULL,
	"account_masked" text,
	"signatories" text
);
--> statement-breakpoint
CREATE TABLE "bank_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_tx_id" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" text NOT NULL,
	"reference" text,
	"payer_name" text,
	"received_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'unmatched' NOT NULL,
	"match_note" text,
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE "business_registration" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"br_number" text NOT NULL,
	"term_years" integer DEFAULT 1 NOT NULL,
	"expires_on" date,
	"branches" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cdd_record" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"person_id" text NOT NULL,
	"risk_rating" text DEFAULT 'medium' NOT NULL,
	"id_document_id" text,
	"address_proof_document_id" text,
	"liveness_checked_on" date,
	"screening_id" text,
	"verified_on" date NOT NULL,
	"review_due_on" date NOT NULL,
	"source_task_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charge" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"description" text NOT NULL,
	"chargee" text,
	"created_on" date NOT NULL,
	"amount" text,
	"satisfied_on" date
);
--> statement-breakpoint
CREATE TABLE "client" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"code" text,
	"jurisdiction" text DEFAULT 'HK' NOT NULL,
	"company_type" text,
	"name_en" text NOT NULL,
	"name_tc" text,
	"name_sc" text,
	"company_number" text,
	"lifecycle" text DEFAULT 'active' NOT NULL,
	"operating_status" text DEFAULT 'operating' NOT NULL,
	"client_group" text,
	"listed_subsidiary" boolean DEFAULT false NOT NULL,
	"staff_id" text,
	"message_lang" text DEFAULT 'en' NOT NULL,
	"doc_lang" text DEFAULT 'en' NOT NULL,
	"risk_rating" text,
	"payment_terms_days" integer DEFAULT 0 NOT NULL,
	"reg_office_en" text,
	"reg_office_zh" text,
	"business_nature_en" text,
	"business_nature_zh" text,
	"incorporated_on" date,
	"fye_month" integer,
	"fye_day" integer,
	"accounts_last_made_up_to" date,
	"auditor" text,
	"registers_kept_at" text,
	"scr_kept_at" text,
	"designated_rep" text,
	"jurisdiction_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"person_id" text,
	"name" text NOT NULL,
	"role" text,
	"email" text,
	"phone" text,
	"channel" text DEFAULT 'email' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"is_billing" boolean DEFAULT false NOT NULL,
	"is_instructing" boolean DEFAULT false NOT NULL,
	"salutation" jsonb
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text,
	"channel" text NOT NULL,
	"provider_thread_id" text,
	"subject" text,
	"counterparty_email" text,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text,
	"person_id" text,
	"task_id" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"storage_key" text,
	"mime" text,
	"sha256" text,
	"language" text,
	"source" text NOT NULL,
	"requirement_key" text,
	"extracted_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "filing" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"form" text NOT NULL,
	"description" text NOT NULL,
	"filed_on" date NOT NULL,
	"reference" text,
	"period_key" text,
	"source_task_id" text
);
--> statement-breakpoint
CREATE TABLE "firm" (
	"id" text PRIMARY KEY NOT NULL,
	"legal_name" text NOT NULL,
	"legal_name_zh" text,
	"tcsp_licence" text,
	"address" text,
	"email" text,
	"phone" text,
	"invoice_prefix" text NOT NULL,
	"invoice_seq" integer DEFAULT 0 NOT NULL,
	"sign_off" jsonb,
	"bank_details" jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"request_id" text,
	"number" text NOT NULL,
	"number_is_custom" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"issued_on" date,
	"due_on" date,
	"terms_days" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'HKD' NOT NULL,
	"total_cents" bigint DEFAULT 0 NOT NULL,
	"paid_cents" bigint DEFAULT 0 NOT NULL,
	"billing_contact_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"supersedes_id" text,
	"xero_invoice_id" text,
	"xero_status" text DEFAULT 'not_synced' NOT NULL,
	"xero_error" text,
	"document_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_line" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"task_id" text,
	"description" text NOT NULL,
	"description_zh" text,
	"amount_cents" bigint NOT NULL,
	"kind" text DEFAULT 'fee' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kv" (
	"firm_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb
);
--> statement-breakpoint
CREATE TABLE "llm_call" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"agent" text NOT NULL,
	"model" text NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error" text,
	"latency_ms" integer,
	"tokens_in" integer,
	"tokens_out" integer,
	"task_id" text,
	"message_id" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_item" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text,
	"document_id" text,
	"received_on" date NOT NULL,
	"sender" text,
	"summary" text,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'logged' NOT NULL,
	"proposal_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"direction" text NOT NULL,
	"provider" text,
	"provider_message_id" text,
	"rfc_message_id" text,
	"in_reply_to" text,
	"from_addr" text,
	"from_name" text,
	"to_addrs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cc_addrs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subject" text,
	"text" text,
	"html" text,
	"language" text,
	"status" text NOT NULL,
	"proposal_id" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"intake" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"bank_transaction_id" text,
	"amount_cents" bigint NOT NULL,
	"received_on" date NOT NULL,
	"method" text NOT NULL,
	"xero_payment_id" text,
	"xero_status" text DEFAULT 'not_synced' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"kind" text DEFAULT 'individual' NOT NULL,
	"name_en" text NOT NULL,
	"name_zh" text,
	"id_type" text,
	"id_number_enc" text,
	"id_country" text,
	"date_of_birth" date,
	"nationality" text,
	"residential_address_enc" text,
	"correspondence_address" text,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbook" (
	"id" text NOT NULL,
	"firm_id" text NOT NULL,
	"version" integer NOT NULL,
	"jurisdiction" text NOT NULL,
	"def" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"client_id" text,
	"task_id" text,
	"request_id" text,
	"title" text NOT NULL,
	"summary" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" text
);
--> statement-breakpoint
CREATE TABLE "reminder" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"level" integer NOT NULL,
	"proposal_id" text,
	"message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"conversation_id" text,
	"source_message_id" text,
	"summary" text,
	"status" text DEFAULT 'open' NOT NULL,
	"invoice_id" text,
	"upload_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_item" (
	"key" text NOT NULL,
	"firm_id" text NOT NULL,
	"def" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening_result" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"person_id" text NOT NULL,
	"task_id" text,
	"provider" text NOT NULL,
	"dataset_version" text,
	"query" jsonb NOT NULL,
	"hits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"adjudication" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text NOT NULL,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secret" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"name" text NOT NULL,
	"ciphertext" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_class" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"name_zh" text,
	"currency" text DEFAULT 'HKD' NOT NULL,
	"voting_rights" boolean DEFAULT true NOT NULL,
	"unit" text DEFAULT 'shares' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_movement" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"share_class_id" text NOT NULL,
	"date" date NOT NULL,
	"kind" text NOT NULL,
	"from_person_id" text,
	"to_person_id" text,
	"quantity" bigint NOT NULL,
	"amount_paid_cents" bigint DEFAULT 0 NOT NULL,
	"consideration_cents" bigint,
	"stamp_duty_cents" bigint,
	"reference" text,
	"note" text,
	"source_task_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sign_envelope" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"task_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"document_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signed_document_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "signer" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"envelope_id" text NOT NULL,
	"person_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"token_hash" text NOT NULL,
	"otp_hash" text,
	"otp_expires_at" timestamp with time zone,
	"otp_attempts" integer DEFAULT 0 NOT NULL,
	"otp_verified_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"signature_kind" text,
	"signature_data" text,
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "significant_controller" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"client_id" text NOT NULL,
	"person_id" text NOT NULL,
	"nature" text NOT NULL,
	"registrable_from" date NOT NULL,
	"ceased_on" date,
	"source_task_id" text
);
--> statement-breakpoint
CREATE TABLE "step_timing" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"task_id" text,
	"proposal_id" text,
	"activity" text NOT NULL,
	"shown_at" timestamp with time zone NOT NULL,
	"acted_at" timestamp with time zone NOT NULL,
	"seconds" integer NOT NULL,
	"edit_chars" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"request_id" text,
	"client_id" text NOT NULL,
	"playbook_id" text NOT NULL,
	"playbook_version" integer NOT NULL,
	"title" text NOT NULL,
	"person_id" text,
	"assignee_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"step_index" integer DEFAULT 0 NOT NULL,
	"step_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"extracted" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"effective_date" date,
	"due_date" date,
	"on_credit" boolean DEFAULT false NOT NULL,
	"period_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "task_event" (
	"id" text PRIMARY KEY NOT NULL,
	"firm_id" text NOT NULL,
	"task_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"kind" text NOT NULL,
	"summary" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "appointment_client_idx" ON "appointment" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_tx_uq" ON "bank_transaction" USING btree ("provider","provider_tx_id");--> statement-breakpoint
CREATE INDEX "contact_email_idx" ON "contact" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_number_uq" ON "invoice" USING btree ("firm_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "job_dedupe_uq" ON "job" USING btree ("firm_id","dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "kv_pk" ON "kv" USING btree ("firm_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "message_provider_uq" ON "message" USING btree ("provider","provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "playbook_pk" ON "playbook" USING btree ("firm_id","id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "request_upload_token_uq" ON "request" USING btree ("upload_token");--> statement-breakpoint
CREATE UNIQUE INDEX "requirement_item_pk" ON "requirement_item" USING btree ("firm_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "secret_name_uq" ON "secret" USING btree ("firm_id","name");--> statement-breakpoint
CREATE INDEX "share_movement_client_idx" ON "share_movement" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "signer_token_uq" ON "signer" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "task_client_idx" ON "task" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "task_event_task_idx" ON "task_event" USING btree ("task_id");