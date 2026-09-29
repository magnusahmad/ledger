// Structured outputs for each agent. All fields required-but-nullable so strict JSON
// schema mode works across providers.
import { z } from "zod";

export const LangZ = z.enum(["en", "tc", "sc"]);

export const FieldZ = z.object({
  key: z.string().describe("Requirement item key from the playbook's list"),
  value: z.string().describe("The value, normalised: ISO dates as YYYY-MM-DD, addresses in full"),
  quote: z.string().nullable().describe("Exact words from the message this came from"),
});

export const PersonRefZ = z.object({
  mode: z.enum(["existing", "new", "none"]),
  personId: z.string().nullable().describe("For existing: id from the client snapshot"),
  nameEn: z.string().nullable(),
  nameZh: z.string().nullable(),
  email: z.string().nullable(),
});

export const ActionZ = z.object({
  type: z.enum([
    "start_request", "provide_information", "change_request", "cancel_request",
    "ask_question", "unsupported_request", "general_correspondence",
  ]),
  taskId: z.string().nullable().describe("For provide_information / change_request / cancel_request: the open task id"),
  playbookId: z.string().nullable().describe("For start_request: playbook id from the catalogue"),
  person: PersonRefZ.nullable(),
  fields: z.array(FieldZ),
  attachments: z.array(z.object({ filename: z.string(), key: z.string().nullable(), personId: z.string().nullable() })),
  effectiveDate: z.string().nullable(),
  description: z.string().nullable().describe("What the client asked, changed, or asked about, in English"),
  confidence: z.number().min(0).max(1),
  evidence: z.string().nullable().describe("Quote supporting this action"),
});
export type IntakeAction = z.infer<typeof ActionZ>;

export const IntakeZ = z.object({
  language: LangZ.describe("Language to reply in: en, tc (Traditional Chinese, incl. Cantonese), sc (Simplified Chinese)"),
  client: z.object({
    kind: z.enum(["existing", "new_prospect", "unclear"]),
    clientId: z.string().nullable(),
    companyName: z.string().nullable().describe("Company the sender writes about, if named"),
    companyNumber: z.string().nullable(),
    senderName: z.string().nullable(),
    reason: z.string(),
  }),
  summary: z.string().describe("One sentence in English: what the sender wants"),
  actions: z.array(ActionZ),
});
export type Intake = z.infer<typeof IntakeZ>;

export const ReviewZ = z.object({
  items: z.array(z.object({
    key: z.string(),
    personId: z.string().nullable(),
    status: z.enum(["needed", "received", "not_needed", "on_file"]),
    value: z.string().nullable(),
    reason: z.string().nullable(),
  })).describe("Full list of requirement items that should be on the checklist after this change"),
  switchPerson: z.object({ nameEn: z.string(), nameZh: z.string().nullable(), personId: z.string().nullable() }).nullable()
    .describe("Set when the task is now about a different person (e.g. a different appointee)"),
  effectiveDate: z.string().nullable(),
  playbookFit: z.enum(["ok", "swap", "add"]),
  suggestedPlaybookId: z.string().nullable(),
  invoiceChange: z.object({ needed: z.boolean(), reason: z.string().nullable() }),
  conflicts: z.array(z.object({ key: z.string(), onFile: z.string(), incoming: z.string(), question: z.string() })),
  questionsForClient: z.array(z.string()),
  summary: z.string(),
});
export type Review = z.infer<typeof ReviewZ>;

export const DraftZ = z.object({
  subject: z.string(),
  body: z.string().describe("Plain-text email body in the requested language, with greeting and sign-off"),
});
export type Draft = z.infer<typeof DraftZ>;

export const PlanZ = z.object({
  title: z.string(),
  items: z.array(z.object({ key: z.string(), labelEn: z.string(), labelTc: z.string(), labelSc: z.string(), kind: z.enum(["data", "file"]) })),
  steps: z.array(z.string()),
  feeHkd: z.number(),
  caveats: z.array(z.string()),
});
export type Plan = z.infer<typeof PlanZ>;

export const ExtractionZ = z.object({
  fields: z.array(FieldZ),
  documents: z.array(z.object({ filename: z.string(), key: z.string().nullable(), personName: z.string().nullable(), description: z.string() })),
  conflicts: z.array(z.object({ key: z.string(), onFile: z.string(), incoming: z.string() })),
});
export type Extraction = z.infer<typeof ExtractionZ>;

export const AdjudicationZ = z.object({
  hits: z.array(z.object({ id: z.string(), verdict: z.enum(["likely_match", "possible", "false_positive"]), reason: z.string() })),
  overall: z.enum(["clear", "potential", "match"]),
});

export const MailItemZ = z.object({
  clientId: z.string().nullable(),
  addressee: z.string(),
  sender: z.string(),
  summaryEn: z.string(),
  urgency: z.enum(["normal", "urgent"]),
  actionNeeded: z.string().nullable(),
});
