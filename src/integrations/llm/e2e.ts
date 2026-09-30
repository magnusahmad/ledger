// Scripted LLM for the Playwright end-to-end test only (LLM_MODE=e2e). Test emails carry
// markers (E2E-NEW, E2E-DETAILS) and the responder reads ids from the prompt's JSON so the
// browser test never depends on a live model (AGENTS.md). Never used by the product.
import type { LlmProvider, LlmRequest, LlmResponse } from "../types";

function lastUser(req: LlmRequest): string {
  const m = [...req.messages].reverse().find((x) => x.role === "user");
  if (!m) return "";
  return typeof m.content === "string" ? m.content : m.content.map((c) => ("text" in c ? c.text : "")).join("\n");
}

function jsonAfter(text: string, marker: string): unknown {
  const i = text.indexOf(marker);
  if (i < 0) return null;
  const rest = text.slice(i + marker.length).trimStart();
  const open = rest[0];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  for (let j = 0; j < rest.length; j++) {
    if (rest[j] === open) depth++;
    else if (rest[j] === close && --depth === 0) { try { return JSON.parse(rest.slice(0, j + 1)); } catch { return null; } }
  }
  return null;
}

const action = (a: Record<string, unknown>) => ({ taskId: null, playbookId: null, person: null, fields: [], attachments: [], effectiveDate: null, description: null, confidence: 0.95, evidence: null, ...a });

export class E2eLlm implements LlmProvider {
  readonly name = "e2e";
  async complete(req: LlmRequest): Promise<LlmResponse> {
    const text = lastUser(req);
    let json: unknown;
    if (req.agent === "intake") {
      const snaps = (jsonAfter(text, "Client snapshots:") as { clientId: string; openTasks: { taskId: string; playbookId: string }[] }[] | null) ?? [];
      const msg = text.slice(text.indexOf("NEW MESSAGE"));
      if (msg.includes("E2E-NEW")) {
        json = { language: "en", client: { kind: "new_prospect", clientId: null, companyName: "Blue Harbour Trading Limited", companyNumber: "3345678", senderName: "Sam Lee", reason: "Unknown sender" }, summary: "Appoint Jane Doe as a director",
          actions: [action({ type: "start_request", playbookId: "hk.appointDirector", person: { mode: "new", personId: null, nameEn: "Jane DOE", nameZh: null, email: "jane.doe@example.com" }, fields: [{ key: "effDate", value: "2026-11-01", quote: "from 1 November" }], description: "Appoint Jane Doe as director" })] };
      } else if (msg.includes("E2E-DETAILS")) {
        const task = snaps.flatMap((s) => s.openTasks).find((t) => t.playbookId === "hk.appointDirector");
        json = { language: "en", client: { kind: "existing", clientId: snaps[0]?.clientId ?? null, companyName: null, companyNumber: null, senderName: "Sam Lee", reason: "Known sender" }, summary: "Details for Jane Doe",
          actions: [action({ type: "provide_information", taskId: task?.taskId ?? null, fields: [
            { key: "idNo", value: "K987654(3), Hong Kong", quote: "K987654(3)" }, { key: "resAddr", value: "Flat 12B, 88 Robinson Road, Mid-Levels, Hong Kong", quote: "Robinson Road" },
            { key: "corrAddr", value: "18/F, 88 Caine Road, Mid-Levels, Hong Kong", quote: "your office" }, { key: "contactInfo", value: "jane.doe@example.com / +852 9123 4567", quote: "+852 9123 4567" }] })] };
      } else {
        json = { language: "en", client: { kind: snaps.length ? "existing" : "unclear", clientId: snaps[0]?.clientId ?? null, companyName: null, companyNumber: null, senderName: null, reason: "" }, summary: "Correspondence", actions: [action({ type: "general_correspondence" })] };
      }
    } else if (req.agent === "draft") {
      const f = (jsonAfter(text, "FACTS:\n```json") ?? {}) as { recipientName?: string; invoice?: { number: string; totalFormatted: string } | null; uploadUrl?: string | null; signOff?: string };
      json = { subject: "Your request", body: [`Dear ${f.recipientName ?? "client"},`, "Thank you for your instructions.", f.invoice ? `Our invoice ${f.invoice.number} for ${f.invoice.totalFormatted} is attached.` : "", f.uploadUrl ? `Please upload documents here:\n${f.uploadUrl}` : "", f.signOff ?? ""].filter(Boolean).join("\n\n") };
    } else if (req.agent === "review") {
      json = { items: [], switchPerson: null, effectiveDate: null, playbookFit: "ok", suggestedPlaybookId: null, invoiceChange: { needed: false, reason: null }, conflicts: [], questionsForClient: [], summary: "No change" };
    } else if (req.agent === "extract") {
      json = { fields: [], documents: [], conflicts: [] };
    } else if (req.agent === "mailbox_review") {
      // E2E-WAIVE: staff told the client the first outstanding item isn't needed.
      const tasks = (jsonAfter(text, "Open tasks:") as { taskId: string; checklist: { key: string; label: string; status: string }[] }[] | null) ?? [];
      const t = tasks.find((x) => x.checklist.some((e) => e.status === "needed"));
      const e = t?.checklist.find((x) => x.status === "needed");
      json = text.includes("E2E-WAIVE") && t && e
        ? { summary: "Staff waived an item", changes: [{ type: "not_needed", taskId: t.taskId, key: e.key, value: null, playbookId: null, text: `${e.label}: not needed`, evidence: "E2E-WAIVE" }] }
        : { summary: "No change", changes: [] };
    } else if (req.agent === "screen") {
      json = { hits: [], overall: "clear" };
    } else {
      throw new Error(`E2eLlm: no script for ${req.agent}`);
    }
    return { json, raw: JSON.stringify(json), model: "e2e" };
  }
}
