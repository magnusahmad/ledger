// The email relevance gate (UHY deploy gap, Gap 5): the pilot reads three personal mailboxes full of
// newsletters, spam, internal mail and unrelated client correspondence. Only mail tied to a case in
// the annual-return cycle gets through; the rest is skipped without storing its content.
import { describe, it, expect } from "vitest";
import { gateMessage, tallySkips, type GateContext, type GateMessage } from "@/annual/mail-gate";

const ctx: GateContext = {
  firmDomains: ["uhy.example"],
  threads: [{ caseId: "case_alpha_ar", clientId: "cl_alpha", conversationIds: ["conv-alpha"], messageIds: ["<sent-1@uhy.example>"] }],
  contacts: [
    { caseId: "case_alpha_ar", clientId: "cl_alpha", dueDate: "2026-12-01", emails: ["finance@alpha.example"], windowFrom: "2026-10-01", windowTo: "2027-01-31" },
    { caseId: "case_alpha_agm", clientId: "cl_alpha", dueDate: "2026-12-20", emails: ["finance@alpha.example"], windowFrom: "2026-10-01", windowTo: "2027-01-31" },
    { caseId: "case_beta_ar", clientId: "cl_beta", dueDate: "2026-12-10", emails: ["boss@beta.example", "shared@group.example"], windowFrom: "2026-10-01", windowTo: "2027-01-31" },
    { caseId: "case_gamma_ar", clientId: "cl_gamma", dueDate: "2026-12-12", emails: ["shared@group.example"], windowFrom: "2026-10-01", windowTo: "2027-01-31" },
  ],
};

function msg(over: Partial<GateMessage> = {}): GateMessage {
  return {
    mailbox: "ruby@uhy.example", folder: "inbox", from: "someone@else.example", to: ["ruby@uhy.example"], cc: [],
    conversationId: "conv-x", internetMessageId: "<m1@else.example>", inReplyTo: null, references: [],
    headers: {}, contentType: "text/plain", isMeetingMessage: false, receivedAt: "2026-11-05T03:00:00Z", ...over,
  };
}

describe("email relevance gate", () => {
  it("a newsletter from an unknown sender is skipped and creates nothing", () => {
    expect(gateMessage(msg({ from: "news@shop.example", headers: { "list-unsubscribe": "<mailto:u@shop.example>" } }), ctx)).toEqual({ decision: "skip", reason: "bulk" });
    expect(gateMessage(msg({ from: "news@shop.example" }), ctx)).toEqual({ decision: "skip", reason: "unrelated" });
  });

  it("mail in Junk, Deleted Items, Drafts or Archive is never read, even from a client", () => {
    for (const folder of ["junkemail", "deleteditems", "drafts", "archive"]) {
      expect(gateMessage(msg({ folder, from: "finance@alpha.example", conversationId: "conv-alpha" }), ctx)).toEqual({ decision: "skip", reason: "folder" });
    }
  });

  it("mail Exchange marked as spam is skipped", () => {
    expect(gateMessage(msg({ from: "finance@alpha.example", headers: { "x-forefront-antispam-report": "CIP:1.2.3.4;SFV:SPM;SCL:9" } }), ctx)).toEqual({ decision: "skip", reason: "spam" });
    expect(gateMessage(msg({ headers: { "x-ms-exchange-organization-scl": "6" } }), ctx)).toEqual({ decision: "skip", reason: "spam" });
  });

  it("an out-of-office reply or delivery failure in a dispatch thread does not reach the case", () => {
    expect(gateMessage(msg({ from: "finance@alpha.example", conversationId: "conv-alpha", headers: { "auto-submitted": "auto-replied" } }), ctx)).toEqual({ decision: "skip", reason: "automated" });
    expect(gateMessage(msg({ from: "mailer-daemon@alpha.example", conversationId: "conv-alpha", contentType: "multipart/report" }), ctx)).toEqual({ decision: "skip", reason: "automated" });
  });

  it("calendar invitations are skipped", () => {
    expect(gateMessage(msg({ from: "finance@alpha.example", isMeetingMessage: true }), ctx)).toEqual({ decision: "skip", reason: "calendar" });
  });

  it("email between UHY staff only is ignored", () => {
    expect(gateMessage(msg({ from: "coe@uhy.example", to: ["ruby@uhy.example"], cc: ["allan@UHY.example"] }), ctx)).toEqual({ decision: "skip", reason: "internal" });
  });

  it("a known client's email outside its cycle window creates nothing", () => {
    expect(gateMessage(msg({ from: "finance@alpha.example", receivedAt: "2027-03-01T03:00:00Z" }), ctx)).toEqual({ decision: "skip", reason: "unrelated" });
  });

  it("a reply in the dispatch thread is linked to its case", () => {
    expect(gateMessage(msg({ from: "new.person@alpha-group.example", conversationId: "conv-alpha" }), ctx)).toEqual({ decision: "link", caseId: "case_alpha_ar", via: "thread" });
    expect(gateMessage(msg({ from: "x@alpha.example", conversationId: "other", inReplyTo: "<sent-1@uhy.example>" }), ctx)).toEqual({ decision: "link", caseId: "case_alpha_ar", via: "thread" });
  });

  it("a reply in a new thread from a contact of a company in cycle is linked to that company's earliest case", () => {
    expect(gateMessage(msg({ from: "Finance@Alpha.example" }), ctx)).toEqual({ decision: "link", caseId: "case_alpha_ar", via: "contact" });
  });

  it("an email we sent to a client contact is linked through its recipients", () => {
    expect(gateMessage(msg({ folder: "sentitems", from: "ruby@uhy.example", to: ["boss@beta.example"] }), ctx)).toEqual({ decision: "link", caseId: "case_beta_ar", via: "contact" });
  });

  it("an email from a contact shared by two companies in cycle asks staff and links to neither", () => {
    expect(gateMessage(msg({ from: "shared@group.example" }), ctx)).toEqual({ decision: "ask", caseIds: ["case_beta_ar", "case_gamma_ar"] });
  });

  it("the coverage report counts skipped mail by reason without keeping any content", () => {
    const results = [
      gateMessage(msg({ headers: { "list-id": "<x>" } }), ctx), gateMessage(msg(), ctx), gateMessage(msg(), ctx),
      gateMessage(msg({ from: "finance@alpha.example" }), ctx),
    ];
    const t = tallySkips(results);
    expect(t).toEqual({ scanned: 4, linked: 1, ask: 0, skipped: { bulk: 1, unrelated: 2 } });
    expect(JSON.stringify(t)).not.toMatch(/alpha|else\.example/);
  });
});
