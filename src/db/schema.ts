// Database schema. Every table carries firm_id (DECISIONS.md #20, #24): RLS is deferred
// for the single-tenant build but the column is here from the first migration.
// Statutory dates are `date` columns (string YYYY-MM-DD); events are timestamptz.
// Money is integer cents in the invoice currency.
import {
  pgTable, text, integer, boolean, date, timestamp, jsonb, bigint, uniqueIndex, index,
} from "drizzle-orm/pg-core";

const firmId = () => text("firm_id").notNull();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export type Lang = "en" | "tc" | "sc";
export type Jurisdiction = "HK" | "CN" | "MO" | "TW";

// ---------- Firm and users ----------
export const firm = pgTable("firm", {
  id: text("id").primaryKey(),
  legalName: text("legal_name").notNull(),
  legalNameZh: text("legal_name_zh"),
  tcspLicence: text("tcsp_licence"),
  address: text("address"),
  email: text("email"),
  phone: text("phone"),
  invoicePrefix: text("invoice_prefix").notNull(),
  invoiceSeq: integer("invoice_seq").notNull().default(0),
  signOff: jsonb("sign_off").$type<Record<Lang, string>>(),
  bankDetails: jsonb("bank_details").$type<Record<string, string>>(),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
});

export const appUser = pgTable("app_user", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  title: text("title"),
  email: text("email"),
  isDemoUser: boolean("is_demo_user").notNull().default(false),
});

// ---------- Records ----------
export const client = pgTable("client", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  code: text("code"),
  jurisdiction: text("jurisdiction").$type<Jurisdiction>().notNull().default("HK"),
  companyType: text("company_type"),
  nameEn: text("name_en").notNull(),
  nameTc: text("name_tc"),
  nameSc: text("name_sc"),
  companyNumber: text("company_number"),
  lifecycle: text("lifecycle").$type<"prospect" | "onboarding" | "active" | "ceased">().notNull().default("active"),
  operatingStatus: text("operating_status").$type<"operating" | "dormant" | "deregistering" | "struck_off" | "not_incorporated">().notNull().default("operating"),
  clientGroup: text("client_group"),
  listedSubsidiary: boolean("listed_subsidiary").notNull().default(false),
  staffId: text("staff_id"),
  messageLang: text("message_lang").$type<Lang>().notNull().default("en"),
  docLang: text("doc_lang").$type<"en" | "tc" | "sc" | "bilingual">().notNull().default("en"),
  riskRating: text("risk_rating").$type<"low" | "medium" | "high">(),
  paymentTermsDays: integer("payment_terms_days").notNull().default(0),
  regOfficeEn: text("reg_office_en"),
  regOfficeZh: text("reg_office_zh"),
  businessNatureEn: text("business_nature_en"),
  businessNatureZh: text("business_nature_zh"),
  incorporatedOn: date("incorporated_on"),
  fyeMonth: integer("fye_month"),
  fyeDay: integer("fye_day"),
  accountsLastMadeUpTo: date("accounts_last_made_up_to"),
  auditor: text("auditor"),
  registersKeptAt: text("registers_kept_at"),
  scrKeptAt: text("scr_kept_at"),
  designatedRep: text("designated_rep"),
  jurisdictionData: jsonb("jurisdiction_data").$type<Record<string, unknown>>().notNull().default({}),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const businessRegistration = pgTable("business_registration", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id").notNull(),
  brNumber: text("br_number").notNull(),
  termYears: integer("term_years").notNull().default(1),
  expiresOn: date("expires_on"),
  branches: jsonb("branches").$type<string[]>().notNull().default([]),
});

export const person = pgTable("person", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  kind: text("kind").$type<"individual" | "corporate">().notNull().default("individual"),
  nameEn: text("name_en").notNull(),
  nameZh: text("name_zh"),
  idType: text("id_type"),
  idNumberEnc: text("id_number_enc"), // encrypted; protected information
  idCountry: text("id_country"),
  dateOfBirth: date("date_of_birth"),
  nationality: text("nationality"),
  residentialAddressEnc: text("residential_address_enc"), // encrypted; protected information
  correspondenceAddress: text("correspondence_address"),
  email: text("email"),
  phone: text("phone"),
  createdAt: createdAt(),
});

export const cddRecord = pgTable("cdd_record", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  personId: text("person_id").notNull(),
  riskRating: text("risk_rating").$type<"low" | "medium" | "high">().notNull().default("medium"),
  idDocumentId: text("id_document_id"),
  addressProofDocumentId: text("address_proof_document_id"),
  livenessCheckedOn: date("liveness_checked_on"),
  screeningId: text("screening_id"),
  verifiedOn: date("verified_on").notNull(),
  reviewDueOn: date("review_due_on").notNull(),
  sourceTaskId: text("source_task_id"),
  createdAt: createdAt(),
});

export type OfficerRole =
  | "director" | "alternate_director" | "reserve_director" | "secretary"
  | "legal_representative" | "supervisor" | "manager" | "administrator" | "responsible_person"
  | "registration_liaison";

export const appointment = pgTable("appointment", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id").notNull(),
  personId: text("person_id").notNull(),
  role: text("role").$type<OfficerRole>().notNull(),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date"), // null = current; the last day in office is toDate - 1 (toDate is cessation date)
  sourceTaskId: text("source_task_id"),
  extra: jsonb("extra").$type<Record<string, unknown>>().notNull().default({}),
}, (t) => [index("appointment_client_idx").on(t.clientId)]);

export const shareClass = pgTable("share_class", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id").notNull(),
  name: text("name").notNull(),
  nameZh: text("name_zh"),
  currency: text("currency").notNull().default("HKD"),
  votingRights: boolean("voting_rights").notNull().default(true),
  unit: text("unit").$type<"shares" | "quota" | "capital">().notNull().default("shares"),
});

export const shareMovement = pgTable("share_movement", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id").notNull(),
  shareClassId: text("share_class_id").notNull(),
  date: date("date").notNull(),
  kind: text("kind").$type<"allotment" | "transfer" | "buyback" | "cancellation" | "capital_change">().notNull(),
  fromPersonId: text("from_person_id"),
  toPersonId: text("to_person_id"),
  quantity: bigint("quantity", { mode: "number" }).notNull(),
  amountPaidCents: bigint("amount_paid_cents", { mode: "number" }).notNull().default(0),
  considerationCents: bigint("consideration_cents", { mode: "number" }),
  stampDutyCents: bigint("stamp_duty_cents", { mode: "number" }),
  reference: text("reference"),
  note: text("note"),
  sourceTaskId: text("source_task_id"),
  createdAt: createdAt(),
}, (t) => [index("share_movement_client_idx").on(t.clientId)]);

export const significantController = pgTable("significant_controller", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id").notNull(),
  personId: text("person_id").notNull(),
  nature: text("nature").notNull(),
  registrableFrom: date("registrable_from").notNull(),
  ceasedOn: date("ceased_on"),
  sourceTaskId: text("source_task_id"),
});

export const charge = pgTable("charge", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id").notNull(),
  description: text("description").notNull(),
  chargee: text("chargee"),
  createdOn: date("created_on").notNull(),
  amount: text("amount"),
  satisfiedOn: date("satisfied_on"),
});

export const bankAccount = pgTable("bank_account", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id").notNull(),
  bank: text("bank").notNull(),
  accountMasked: text("account_masked"),
  signatories: text("signatories"),
});

export const contact = pgTable("contact", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id").notNull(),
  personId: text("person_id"),
  name: text("name").notNull(),
  role: text("role"),
  email: text("email"),
  phone: text("phone"),
  channel: text("channel").$type<"email" | "wechat" | "whatsapp" | "phone">().notNull().default("email"),
  language: text("language").$type<Lang>().notNull().default("en"),
  isBilling: boolean("is_billing").notNull().default(false),
  isInstructing: boolean("is_instructing").notNull().default(false),
  salutation: jsonb("salutation").$type<Partial<Record<Lang, string>>>(),
}, (t) => [index("contact_email_idx").on(t.email)]);

export const filing = pgTable("filing", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id").notNull(),
  form: text("form").notNull(),
  description: text("description").notNull(),
  filedOn: date("filed_on").notNull(),
  reference: text("reference"),
  periodKey: text("period_key"), // e.g. "NAR1:2026" satisfies that period's deadline
  sourceTaskId: text("source_task_id"),
});

export const document = pgTable("document", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id"),
  personId: text("person_id"),
  taskId: text("task_id"),
  kind: text("kind").notNull(), // id_copy, address_proof, resolution, form, certificate, letter, invoice, upload, signed, mail_item...
  title: text("title").notNull(),
  storageKey: text("storage_key"),
  mime: text("mime"),
  sha256: text("sha256"),
  language: text("language"),
  source: text("source").$type<"upload" | "email" | "generated" | "signed" | "seed" | "scan">().notNull(),
  requirementKey: text("requirement_key"),
  extractedText: text("extracted_text"),
  createdAt: createdAt(),
});

export const secret = pgTable("secret", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  name: text("name").notNull(),
  ciphertext: text("ciphertext").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("secret_name_uq").on(t.firmId, t.name)]);

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Work engine ----------
export const playbook = pgTable("playbook", {
  id: text("id").notNull(),
  firmId: firmId(),
  version: integer("version").notNull(),
  jurisdiction: text("jurisdiction").$type<Jurisdiction>().notNull(),
  def: jsonb("def").$type<import("@/domain/playbook-types").PlaybookDef>().notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("playbook_pk").on(t.firmId, t.id, t.version)]);

export const requirementItem = pgTable("requirement_item", {
  key: text("key").notNull(),
  firmId: firmId(),
  def: jsonb("def").$type<import("@/domain/playbook-types").RequirementDef>().notNull(),
}, (t) => [uniqueIndex("requirement_item_pk").on(t.firmId, t.key)]);

export const request = pgTable("request", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id").notNull(),
  conversationId: text("conversation_id"),
  sourceMessageId: text("source_message_id"),
  summary: text("summary"),
  status: text("status").$type<"open" | "done" | "cancelled">().notNull().default("open"),
  invoiceId: text("invoice_id"),
  uploadToken: text("upload_token").notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("request_upload_token_uq").on(t.uploadToken)]);

export type ChecklistStatus = "on_file" | "needed" | "received" | "not_needed";
export type ChecklistEntry = {
  key: string;             // requirement item key
  personId?: string | null; // for person-scoped items
  status: ChecklistStatus;
  value?: string | null;   // extracted value for data items
  documentId?: string | null;
  source?: string | null;  // quote or "portal" / "on file"
  reason?: string | null;
  confidence?: number | null;
  optional?: boolean;
};

export const task = pgTable("task", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  requestId: text("request_id"),
  clientId: text("client_id").notNull(),
  playbookId: text("playbook_id").notNull(),
  playbookVersion: integer("playbook_version").notNull(),
  title: text("title").notNull(),
  personId: text("person_id"),
  assigneeId: text("assignee_id"),
  status: text("status").$type<"open" | "done" | "cancelled">().notNull().default("open"),
  stepIndex: integer("step_index").notNull().default(0),
  stepState: jsonb("step_state").$type<Record<string, unknown>>().notNull().default({}),
  checklist: jsonb("checklist").$type<ChecklistEntry[]>().notNull().default([]),
  extracted: jsonb("extracted").$type<Record<string, unknown>>().notNull().default({}),
  params: jsonb("params").$type<Record<string, unknown>>().notNull().default({}),
  effectiveDate: date("effective_date"),
  dueDate: date("due_date"),
  onCredit: boolean("on_credit").notNull().default(false),
  periodKey: text("period_key"),
  createdAt: createdAt(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => [index("task_client_idx").on(t.clientId)]);

export const taskEvent = pgTable("task_event", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  taskId: text("task_id").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  actor: text("actor").notNull(), // "system" | "agent" | "client" | user id
  kind: text("kind").notNull(),
  summary: text("summary").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
}, (t) => [index("task_event_task_idx").on(t.taskId)]);

export type ProposalKind =
  | "send_message" | "change_request" | "cancel_task" | "revise_invoice" | "register_change"
  | "record_filing" | "triage" | "conflict" | "match_payment" | "screening_review" | "custom_plan"
  | "send_signing" | "new_request" | "mailbox_update";

export const proposal = pgTable("proposal", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  kind: text("kind").$type<ProposalKind>().notNull(),
  status: text("status").$type<"pending" | "approved" | "rejected" | "superseded">().notNull().default("pending"),
  clientId: text("client_id"),
  taskId: text("task_id"),
  requestId: text("request_id"),
  title: text("title").notNull(),
  summary: text("summary"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: text("decided_by"),
});

// ---------- Messaging ----------
export const conversation = pgTable("conversation", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id"),
  channel: text("channel").$type<"email" | "paste" | "wechat" | "portal">().notNull(),
  providerThreadId: text("provider_thread_id"),
  subject: text("subject"),
  counterpartyEmail: text("counterparty_email"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const message = pgTable("message", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  conversationId: text("conversation_id").notNull(),
  direction: text("direction").$type<"in" | "out">().notNull(),
  provider: text("provider"),
  providerMessageId: text("provider_message_id"),
  rfcMessageId: text("rfc_message_id"),
  inReplyTo: text("in_reply_to"),
  fromAddr: text("from_addr"),
  fromName: text("from_name"),
  toAddrs: jsonb("to_addrs").$type<string[]>().notNull().default([]),
  ccAddrs: jsonb("cc_addrs").$type<string[]>().notNull().default([]),
  subject: text("subject"),
  text: text("text"),
  html: text("html"),
  language: text("language"),
  status: text("status").$type<"received" | "draft" | "approved" | "sent" | "failed">().notNull(),
  proposalId: text("proposal_id"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  intake: jsonb("intake").$type<Record<string, unknown>>(),
  error: text("error"),
  /** Sent by staff straight from the shared mailbox (e.g. Gmail), not through Harbourline. */
  viaMailbox: boolean("via_mailbox").notNull().default(false),
}, (t) => [uniqueIndex("message_provider_uq").on(t.provider, t.providerMessageId)]);

export const attachment = pgTable("attachment", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  messageId: text("message_id").notNull(),
  documentId: text("document_id"),
  filename: text("filename").notNull(),
  mime: text("mime"),
  size: integer("size"),
});

// ---------- Billing ----------
export const invoice = pgTable("invoice", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id").notNull(),
  requestId: text("request_id"),
  number: text("number").notNull(),
  numberIsCustom: boolean("number_is_custom").notNull().default(false),
  status: text("status").$type<"draft" | "sent" | "part_paid" | "paid" | "void">().notNull().default("draft"),
  issuedOn: date("issued_on"),
  dueOn: date("due_on"),
  termsDays: integer("terms_days").notNull().default(0),
  currency: text("currency").notNull().default("HKD"),
  totalCents: bigint("total_cents", { mode: "number" }).notNull().default(0),
  paidCents: bigint("paid_cents", { mode: "number" }).notNull().default(0),
  billingContactId: text("billing_contact_id"),
  version: integer("version").notNull().default(1),
  supersedesId: text("supersedes_id"),
  xeroInvoiceId: text("xero_invoice_id"),
  xeroStatus: text("xero_status").$type<"not_synced" | "synced" | "error">().notNull().default("not_synced"),
  xeroError: text("xero_error"),
  documentId: text("document_id"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("invoice_number_uq").on(t.firmId, t.number)]);

export const invoiceLine = pgTable("invoice_line", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  invoiceId: text("invoice_id").notNull(),
  taskId: text("task_id"),
  description: text("description").notNull(),
  descriptionZh: text("description_zh"),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  kind: text("kind").$type<"fee" | "disbursement">().notNull().default("fee"),
  sort: integer("sort").notNull().default(0),
});

export const bankTransaction = pgTable("bank_transaction", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  provider: text("provider").notNull(),
  providerTxId: text("provider_tx_id").notNull(),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  reference: text("reference"),
  payerName: text("payer_name"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  status: text("status").$type<"unmatched" | "matched" | "proposed" | "ignored">().notNull().default("unmatched"),
  matchNote: text("match_note"),
  raw: jsonb("raw").$type<Record<string, unknown>>(),
}, (t) => [uniqueIndex("bank_tx_uq").on(t.provider, t.providerTxId)]);

export const payment = pgTable("payment", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  invoiceId: text("invoice_id").notNull(),
  bankTransactionId: text("bank_transaction_id"),
  amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
  receivedOn: date("received_on").notNull(),
  method: text("method").$type<"bank_auto" | "bank_approved" | "manual">().notNull(),
  xeroPaymentId: text("xero_payment_id"),
  xeroStatus: text("xero_status").$type<"not_synced" | "synced" | "error">().notNull().default("not_synced"),
  createdAt: createdAt(),
});

export const reminder = pgTable("reminder", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  invoiceId: text("invoice_id").notNull(),
  level: integer("level").notNull(),
  proposalId: text("proposal_id"),
  messageId: text("message_id"),
  createdAt: createdAt(),
});

// ---------- Signing ----------
export const signEnvelope = pgTable("sign_envelope", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  taskId: text("task_id").notNull(),
  status: text("status").$type<"draft" | "sent" | "completed" | "voided">().notNull().default("draft"),
  documentIds: jsonb("document_ids").$type<string[]>().notNull().default([]),
  signedDocumentIds: jsonb("signed_document_ids").$type<string[]>().notNull().default([]),
  createdAt: createdAt(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const signer = pgTable("signer", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  envelopeId: text("envelope_id").notNull(),
  personId: text("person_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role"),
  tokenHash: text("token_hash").notNull(),
  otpHash: text("otp_hash"),
  otpExpiresAt: timestamp("otp_expires_at", { withTimezone: true }),
  otpAttempts: integer("otp_attempts").notNull().default(0),
  otpVerifiedAt: timestamp("otp_verified_at", { withTimezone: true }),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signatureKind: text("signature_kind").$type<"typed" | "drawn">(),
  signatureData: text("signature_data"),
  ip: text("ip"),
  userAgent: text("user_agent"),
}, (t) => [uniqueIndex("signer_token_uq").on(t.tokenHash)]);

// ---------- Screening ----------
export const screeningResult = pgTable("screening_result", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  personId: text("person_id").notNull(),
  taskId: text("task_id"),
  provider: text("provider").notNull(),
  datasetVersion: text("dataset_version"),
  query: jsonb("query").$type<Record<string, unknown>>().notNull(),
  hits: jsonb("hits").$type<Record<string, unknown>[]>().notNull().default([]),
  adjudication: jsonb("adjudication").$type<Record<string, unknown>[]>().notNull().default([]),
  status: text("status").$type<"clear" | "potential" | "match" | "cleared_by_staff" | "escalated">().notNull(),
  reviewedBy: text("reviewed_by"),
  createdAt: createdAt(),
});

// ---------- Registered office mail ----------
export const mailItem = pgTable("mail_item", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  clientId: text("client_id"),
  documentId: text("document_id"),
  receivedOn: date("received_on").notNull(),
  sender: text("sender"),
  summary: text("summary"),
  urgency: text("urgency").$type<"normal" | "urgent">().notNull().default("normal"),
  status: text("status").$type<"logged" | "notified">().notNull().default("logged"),
  proposalId: text("proposal_id"),
  createdAt: createdAt(),
});

// ---------- Measurement, LLM log, jobs, kv ----------
export const stepTiming = pgTable("step_timing", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  taskId: text("task_id"),
  proposalId: text("proposal_id"),
  activity: text("activity").notNull(), // e.g. "approve_request_reply", "confirm_extraction"
  shownAt: timestamp("shown_at", { withTimezone: true }).notNull(),
  actedAt: timestamp("acted_at", { withTimezone: true }).notNull(),
  seconds: integer("seconds").notNull(),
  editChars: integer("edit_chars").notNull().default(0),
});

export const llmCall = pgTable("llm_call", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  agent: text("agent").notNull(),
  model: text("model").notNull(),
  input: jsonb("input").$type<unknown>(),
  output: jsonb("output").$type<unknown>(),
  error: text("error"),
  latencyMs: integer("latency_ms"),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  taskId: text("task_id"),
  messageId: text("message_id"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const job = pgTable("job", {
  id: text("id").primaryKey(),
  firmId: firmId(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  dedupeKey: text("dedupe_key"),
  status: text("status").$type<"queued" | "running" | "done" | "failed">().notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
  lastError: text("last_error"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("job_dedupe_uq").on(t.firmId, t.dedupeKey)]);

export const kv = pgTable("kv", {
  firmId: firmId(),
  key: text("key").notNull(),
  value: jsonb("value").$type<unknown>(),
}, (t) => [uniqueIndex("kv_pk").on(t.firmId, t.key)]);
