import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { createRequest, startTask, advance, markStepState, getTask } from "@/domain/engine";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { membersAsAt, issuedAsAt } from "@/domain/shares";
import { stampDuty } from "@/domain/stamp-duty";
import { upcomingDeadlines } from "@/domain/deadlines";
import { batchStart } from "@/domain/batch";
import { logMailItem } from "@/domain/mail-items";
import { filing, invoice, significantController, mailItem, shareMovement } from "@/db/schema";
import { updateClient } from "@/domain/records";
import "@/domain/inbound";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
});

/** Runs a playbook task on the showcase client up to its register step. */
async function toRegister(playbookId: string, extracted: Record<string, { value: string }>) {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId, extracted });
  const { tickItem } = await import("@/domain/step-hooks");
  await markStepState(ctx, t.id, "send", { sent: true });
  for (const e of (await getTask(ctx, t.id)).checklist.filter((x) => x.status === "needed")) await tickItem(ctx, t.id, e.key, "provided");
  for (const k of ["sign"]) { try { await markStepState(ctx, t.id, k as never, { signed: true }); } catch { /* no sign step */ } }
  await advance(ctx, t.id);
  const fp = (await pendingProposals(ctx, { taskId: t.id, kind: "record_filing" }))[0];
  if (fp) await approveProposal(ctx, fp.id, { edits: { reference: "REF-1" } });
  return t;
}

describe("Share movements from client instructions", () => {
  it("an allotment updates the members register and share capital as at the allotment date, and adds a new significant controller", async () => {
    ctx.llm.on("structure", { items: [{ kind: "allotment", fromPersonId: null, fromName: null, toPersonId: null, toName: "MA Siu Fung", toNameZh: "馬少峰", className: "Ordinary", quantity: 10000, pricePerShareCents: 100, considerationCents: 1000000 }] });
    const t = await toRegister("hk.allotShares", { allotmentDetails: { value: "10,000 ordinary shares to MA Siu Fung at HK$1 each, fully paid" }, effDate: { value: "2026-10-20" } });
    const [reg] = await pendingProposals(ctx, { taskId: t.id, kind: "register_change" });
    expect(reg.summary).toMatch(/Allot 10,000 Ordinary shares to MA Siu Fung on 2026-10-20/);
    expect(reg.summary).toMatch(/significant controller/i);
    await approveProposal(ctx, reg.id);
    const before = await membersAsAt(ctx, "cli_c1", "2026-10-19");
    const after = await membersAsAt(ctx, "cli_c1", "2026-10-20");
    expect(before.map((m) => m.name)).not.toContain("MA Siu Fung");
    expect(after.find((m) => m.name === "MA Siu Fung")).toMatchObject({ quantity: 10000, percent: 50 });
    expect((await issuedAsAt(ctx, "cli_c1", "2026-10-20"))[0]).toMatchObject({ issued: 20000, paidUpCents: 2000000 });
    const scs = await ctx.db.select().from(significantController).where(eq(significantController.clientId, "cli_c1"));
    expect(scs.filter((s) => !s.ceasedOn).length).toBe(2); // CHAN (35%) and MA (50%); LEE drops to 15%
    expect(scs.find((s) => s.ceasedOn)).toBeTruthy();
  });

  it("stamp duty on a transfer is 0.1% on each of the bought and sold notes, on the higher of consideration and value, rounded up per HK$1,000, plus HK$5 on the instrument", () => {
    expect(stampDuty({ considerationCents: 30000000, valueCents: 30050000 })).toEqual({ perNoteCents: 30100, instrumentCents: 500, totalCents: 60700, basisCents: 30050000 });
    expect(stampDuty({ considerationCents: 100000, valueCents: 0 })).toMatchObject({ perNoteCents: 100, totalCents: 700 });
  });

  it("a transfer moves the shares on the stamping date and records the stamp duty", async () => {
    ctx.llm.on("structure", { items: [{ kind: "transfer", fromPersonId: "per_p2", fromName: "LEE Siu Ling", toPersonId: "per_p1", toName: "CHAN Tai Man", toNameZh: null, className: "Ordinary", quantity: 3000, pricePerShareCents: null, considerationCents: 30000000 }] });
    const t = await toRegister("hk.transferShares", { transferDetails: { value: "LEE Siu Ling transfers 3,000 shares to CHAN Tai Man for HK$300,000" }, effDate: { value: "2026-10-05" }, shareValuation: { value: "accounts.pdf" } });
    const [reg] = await pendingProposals(ctx, { taskId: t.id, kind: "register_change" });
    await approveProposal(ctx, reg.id);
    expect((await membersAsAt(ctx, "cli_c1", "2026-10-05")).map((m) => [m.name, m.quantity])).toEqual([["CHAN Tai Man", 10000]]);
    const [mv] = await ctx.db.select().from(shareMovement).where(eq(shareMovement.sourceTaskId, t.id));
    expect(mv.stampDutyCents).toBe(60500);
  });
});

describe("Deadline engine", () => {
  it("the annual return deadline is 42 days after this year's anniversary, and a filed NAR1 for that year clears it", async () => {
    const d = (await upcomingDeadlines(ctx, { clientId: "cli_c1", withinDays: 120 })).find((x) => x.key === "NAR1");
    expect(d).toMatchObject({ dueDate: "2026-12-09", periodKey: "NAR1:2026", playbookId: "hk.annualReturn" });
    await ctx.db.insert(filing).values({ id: "fil_x", firmId: ctx.firmId, clientId: "cli_c1", form: "NAR1", description: "Annual return 2026", filedOn: "2026-11-01", periodKey: "NAR1:2026" });
    expect((await upcomingDeadlines(ctx, { clientId: "cli_c1", withinDays: 120 })).find((x) => x.key === "NAR1")).toBeUndefined();
  });

  it("a dormant company has no AGM deadline but still has its annual return", async () => {
    const all = await upcomingDeadlines(ctx, { clientId: "cli_c5", withinDays: 400 });
    expect(all.map((d) => d.key)).not.toContain("AGM");
    expect(all.map((d) => d.key)).toContain("NAR1");
  });

  it("the business registration expiry and CDD review dates are deadlines", async () => {
    const all = await upcomingDeadlines(ctx, { clientId: "cli_c1", withinDays: 60 });
    expect(all.find((d) => d.key === "BR")).toMatchObject({ dueDate: "2026-10-27", playbookId: "hk.brRenewal" });
    expect(all.find((d) => d.key === "KYC")).toMatchObject({ dueDate: "2026-11-02", playbookId: "hk.kycReview" });
  });

  it("a deadline already covered by an open task isn't offered again", async () => {
    const req = await createRequest(ctx, { clientId: "cli_c1" });
    await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.brRenewal", periodKey: "BR:2026-10-27" });
    expect((await upcomingDeadlines(ctx, { clientId: "cli_c1", withinDays: 60 })).find((d) => d.key === "BR")).toBeUndefined();
  });

  it("an AGM deadline is 9 months after the financial year end and clears once the AGM for that year end is recorded", async () => {
    const agm = (await upcomingDeadlines(ctx, { clientId: "cli_c2", withinDays: 400 })).find((d) => d.key === "AGM");
    expect(agm).toMatchObject({ dueDate: "2026-09-30", periodKey: "AGM:2025" }); // Silverstrand, FYE 31 Dec
    await updateClient(ctx, "cli_c2", { jurisdictionData: { lastAgm: "2026-06-30" } }, "test");
    expect((await upcomingDeadlines(ctx, { clientId: "cli_c2", withinDays: 400 })).find((d) => d.key === "AGM")?.periodKey).not.toBe("AGM:2025");
  });
});

describe("Batch operations (Mass Production)", () => {
  it("batch start creates one task, one invoice and one drafted request per selected client, queued for approval", async () => {
    ctx.llm.on("draft", goodDraft);
    const r = await batchStart(ctx, { playbookId: "hk.annualReturn", clientIds: ["cli_c1", "cli_c2", "cli_c4"], periodYear: 2026 });
    expect(r.created).toBe(3);
    const props = await pendingProposals(ctx, { kind: "send_message" });
    expect(props).toHaveLength(3);
    const invs = await ctx.db.select().from(invoice).where(eq(invoice.status, "draft"));
    expect(invs).toHaveLength(3);
    expect(invs.every((i) => i.totalCents === 130500)).toBe(true); // HK$1,200 fee + HK$105 NAR1 fee
    const again = await batchStart(ctx, { playbookId: "hk.annualReturn", clientIds: ["cli_c1"], periodYear: 2026 });
    expect(again).toMatchObject({ created: 0, skipped: [expect.objectContaining({ clientId: "cli_c1" })] });
  });
});

describe("Registered office mail", () => {
  it("a scanned letter is matched to its client, logged, and a notification is drafted for approval in the client's language", async () => {
    ctx.llm.on("mail", { clientId: "cli_c4", addressee: "Tsing Yi Logistics Limited", sender: "Inland Revenue Department", summaryEn: "Profits tax return for 2025/26, due in one month", urgency: "urgent", actionNeeded: "Send the audited accounts to the auditor" });
    ctx.llm.on("draft", (req: { messages: { content: unknown }[] }) => ({ subject: "郵件通知", body: "林太您好：\n\n我們收到稅務局來信（利得稅報稅表）。\n\n葉嘉欣" }));
    const r = await logMailItem(ctx, { filename: "scan.pdf", mime: "application/pdf", content: Buffer.from("%PDF-1.4 IRD letter"), receivedOn: "2026-09-29" });
    const [row] = await ctx.db.select().from(mailItem).where(eq(mailItem.id, r.id));
    expect(row).toMatchObject({ clientId: "cli_c4", urgency: "urgent", sender: "Inland Revenue Department" });
    const [p] = await pendingProposals(ctx, { kind: "send_message" });
    const msg = await ctx.db.query.message.findFirst({ where: (m, { eq }) => eq(m.id, p.payload.messageId as string) });
    expect(msg!.language).toBe("tc");
  });
});
