// Builders for scripted agent responses (recorded-fixture style).
import type { Intake, IntakeAction, Review } from "@/agent/schemas";
import type { LlmRequest } from "@/integrations/types";

export function action(a: Partial<IntakeAction> & Pick<IntakeAction, "type">): IntakeAction {
  return {
    taskId: null, playbookId: null, person: null, fields: [], attachments: [], effectiveDate: null,
    description: null, confidence: 0.95, evidence: null, ...a,
  };
}

export function intake(i: Partial<Intake> & { actions: IntakeAction[] }): Intake {
  return {
    language: "en",
    client: { kind: "existing", clientId: "cli_c1", companyName: "Kowloon Bay Trading Limited", companyNumber: null, senderName: "CHAN Tai Man", reason: "Sender is the instructing director" },
    summary: "Client request",
    ...i,
  };
}

export function review(r: Partial<Review> & { items: Review["items"] }): Review {
  return {
    switchPerson: null, effectiveDate: null, playbookFit: "ok", suggestedPlaybookId: null,
    invoiceChange: { needed: false, reason: null }, conflicts: [], questionsForClient: [], summary: "Reviewed", ...r,
  };
}

/** Pull the facts JSON the drafting agent was given. */
export function factsOf(req: LlmRequest): Record<string, unknown> {
  const m = req.messages[req.messages.length - 1];
  const text = typeof m.content === "string" ? m.content : "";
  const j = text.match(/```json\n([\s\S]*?)\n```/);
  return j ? JSON.parse(j[1]) : {};
}

/** A well-behaved drafting responder: mentions every fact the validator requires. */
export function goodDraft(req: LlmRequest) {
  const f = factsOf(req) as { language?: string; invoice?: { number: string; totalFormatted: string } | null; uploadUrl?: string | null; recipientName?: string };
  const parts = [f.language === "tc" ? `${f.recipientName ?? ""}您好：` : `Dear ${f.recipientName ?? "client"},`, "Thank you for your instructions."];
  if (f.invoice) parts.push(`Invoice ${f.invoice.number} for ${f.invoice.totalFormatted} is attached.`);
  if (f.uploadUrl) parts.push(`Upload here: ${f.uploadUrl}`);
  parts.push("Karen Yip");
  return { subject: "Re: your request", body: parts.join("\n\n") };
}
