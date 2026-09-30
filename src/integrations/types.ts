// External-system interfaces (AGENTS.md: external systems behind interfaces, faked in tests).

// ---------- LLM ----------
export type LlmMessage =
  | { role: "system" | "user" | "assistant"; content: string }
  | { role: "user"; content: ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } } | { type: "file"; file: { filename: string; file_data: string } })[] };

export type LlmRequest = {
  agent: string;
  messages: LlmMessage[];
  /** JSON schema for structured output. */
  schema: Record<string, unknown>;
  schemaName: string;
  temperature?: number;
};

export type LlmResponse = { json: unknown; raw: string; tokensIn?: number; tokensOut?: number; model: string };

export interface LlmProvider {
  readonly name: string;
  complete(req: LlmRequest): Promise<LlmResponse>;
}

// ---------- Mail ----------
export type MailAttachment = { filename: string; mime: string; content: Buffer };

export type InboundMail = {
  provider: string;
  providerMessageId: string;
  providerThreadId?: string | null;
  rfcMessageId?: string | null;
  inReplyTo?: string | null;
  references?: string[];
  from: { email: string; name?: string | null };
  /** Set by providers that can tell: the firm sent this from the mailbox itself. */
  sentByUs?: boolean;
  to: string[];
  cc: string[];
  subject: string;
  text: string;          // quoted history stripped where the provider supports it
  html?: string | null;
  receivedAt: Date;
  attachments: MailAttachment[];
};

export type OutboundMail = {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
  inReplyTo?: string | null;
  references?: string[];
  providerThreadId?: string | null;
};

export type SentMail = { providerMessageId: string; providerThreadId?: string | null; rfcMessageId?: string | null };

export interface MailProvider {
  readonly name: string;
  readonly address: string;
  /** Returns messages newer than the stored cursor, and the new cursor. */
  fetchNew(cursor: string | null): Promise<{ messages: InboundMail[]; cursor: string | null }>;
  send(mail: OutboundMail): Promise<SentMail>;
}

// ---------- Bank ----------
export type BankDeposit = {
  providerTxId: string;
  amountCents: number;
  currency: string;
  reference: string | null;
  payerName: string | null;
  receivedAt: Date;
  raw?: Record<string, unknown>;
};

export interface BankProvider {
  readonly name: string;
  listDeposits(since: Date | null): Promise<BankDeposit[]>;
  /** Sandbox/demo only. */
  simulateDeposit?(d: { amountCents: number; currency: string; reference: string; payerName: string }): Promise<BankDeposit | null>;
  accountDetails(): Promise<Record<string, string>>;
}

// ---------- Accounting ----------
export type AccountingInvoice = {
  contactName: string;
  contactEmail?: string | null;
  number: string;
  issuedOn: string;
  dueOn: string;
  currency: string;
  lines: { description: string; amountCents: number; accountCode?: string }[];
};

export interface AccountingProvider {
  readonly name: string;
  upsertContact(name: string, email?: string | null): Promise<string>;
  createInvoice(inv: AccountingInvoice, contactId: string): Promise<string>;
  findInvoiceByNumber(number: string): Promise<string | null>;
  createPayment(p: { invoiceId: string; amountCents: number; date: string; reference: string }): Promise<string>;
  close?(): Promise<void>;
}

// ---------- Screening ----------
export type ScreeningQuery = { name: string; nameZh?: string | null; birthDate?: string | null; nationality?: string | null };
export type ScreeningHit = {
  id: string; caption: string; score: number; topics: string[]; datasets: string[];
  birthDates?: string[]; countries?: string[];
};
export interface ScreeningProvider {
  readonly name: string;
  datasetVersion(): Promise<string>;
  match(q: ScreeningQuery): Promise<ScreeningHit[]>;
}

// ---------- Storage ----------
export interface Storage {
  put(key: string, content: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}
