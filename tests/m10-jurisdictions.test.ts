import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { createRequest, startTask, advance, markStepState, getTask } from "@/domain/engine";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { upcomingDeadlines } from "@/domain/deadlines";
import { membersAsAt } from "@/domain/shares";
import { officersAsAt, createPerson } from "@/domain/records";
import { playbookCatalogue } from "@/agent/context";
import { generateForTask } from "@/documents/generate";
import { document, filing } from "@/db/schema";
import "@/domain/inbound";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb();
  ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
});

async function toRegister(clientId: string, playbookId: string, extracted: Record<string, { value: string }>, personId?: string) {
  const req = await createRequest(ctx, { clientId });
  const t = await startTask(ctx, { requestId: req.id, clientId, playbookId, extracted, personId });
  const { tickItem } = await import("@/domain/step-hooks");
  await markStepState(ctx, t.id, "send", { sent: true });
  await markStepState(ctx, t.id, "pay", { waived: true }); // upfront clients: payment handled outside this test
  for (const e of (await getTask(ctx, t.id)).checklist.filter((x) => x.status === "needed")) await tickItem(ctx, t.id, e.key, "provided");
  try { await markStepState(ctx, t.id, "sign", { signed: true }); } catch { /* none */ }
  await advance(ctx, t.id);
  const fp = (await pendingProposals(ctx, { taskId: t.id, kind: "record_filing" }))[0];
  if (fp) await approveProposal(ctx, fp.id, { edits: { reference: "REF-1" } });
  return t;
}

describe("Mainland China", () => {
  it("the annual report is due by 30 June for the previous year and clears once filed", async () => {
    ctx.clock.set("2027-05-01T02:00:00Z");
    const d = (await upcomingDeadlines(ctx, { clientId: "cli_cn1", withinDays: 90 })).find((x) => x.key === "CNAR");
    expect(d).toMatchObject({ dueDate: "2027-06-30", periodKey: "CNAR:2026", playbookId: "cn.annualReport" });
    await ctx.db.insert(filing).values({ id: "f1", firmId: ctx.firmId, clientId: "cli_cn1", form: "Annual report", description: "2026", filedOn: "2027-05-02", periodKey: "CNAR:2026" });
    expect((await upcomingDeadlines(ctx, { clientId: "cli_cn1", withinDays: 90 })).find((x) => x.key === "CNAR")).toBeUndefined();
  });

  it("capital contributions due within the horizon are deadlines, and pre-2024 companies with contribution dates after 30 June 2032 must adjust by 30 June 2027", async () => {
    const all = await upcomingDeadlines(ctx, { clientId: "cli_cn1", withinDays: 1200 });
    expect(all.find((d) => d.key === "CNCAPADJ")).toMatchObject({ dueDate: "2027-06-30", playbookId: "cn.changeCapital" });
    expect(all.find((d) => d.key === "CNCAP")).toMatchObject({ dueDate: "2028-12-31" });
  });

  it("the new legal representative must be a director or manager; the register change is refused otherwise", async () => {
    const outsider = await createPerson(ctx, { nameEn: "ZHAO Lei", nameZh: "赵磊" });
    const t = await toRegister("cli_cn1", "cn.changeLegalRep", { cnLegalRepDetails: { value: "赵磊 as legal representative" }, cnDecision: { value: "Sole shareholder decision" } }, outsider.id);
    const [reg] = await pendingProposals(ctx, { taskId: t.id, kind: "register_change" });
    expect(reg.summary).toMatch(/must be a director or manager/i);
    await expect(approveProposal(ctx, reg.id)).rejects.toThrow(/director or manager/i);
  });

  it("a director can become legal representative, replacing the previous one as at the effective date", async () => {
    const t = await toRegister("cli_cn1", "cn.changeLegalRep", { cnLegalRepDetails: { value: "LEE Siu Ling" }, cnDecision: { value: "decision" } }, "per_p2");
    const [reg] = await pendingProposals(ctx, { taskId: t.id, kind: "register_change" });
    await approveProposal(ctx, reg.id);
    expect((await officersAsAt(ctx, "cli_cn1", ctx.clock.today(), "legal_representative")).map((o) => o.person.nameEn)).toEqual(["LEE Siu Ling"]);
  });

  it("documents for a PRC company are drafted in Simplified Chinese", async () => {
    const req = await createRequest(ctx, { clientId: "cli_cn1" });
    const t = await startTask(ctx, { requestId: req.id, clientId: "cli_cn1", playbookId: "cn.changeAddress", extracted: { cnNewAddress: { value: "深圳市前海深港合作区前湾一路1号A栋201室" }, effDate: { value: "2026-11-01" } } });
    const docs = await generateForTask(ctx, t.id);
    const d = await ctx.db.query.document.findFirst({ where: eq(document.id, docs[0].id) });
    expect(d!.language).toBe("sc");
    expect(d!.extractedText).toContain("股东决定");
    expect(d!.extractedText).toContain("深圳前海港湾贸易有限公司");
  });
});

describe("Taiwan", () => {
  it("a change of directors must be registered within 15 days, and the Article 22-1 annual declaration is due by 31 March", async () => {
    const req = await createRequest(ctx, { clientId: "cli_tw1" });
    const t = await startTask(ctx, { requestId: req.id, clientId: "cli_tw1", playbookId: "tw.changeDirectors", extracted: { effDate: { value: "2026-10-01" } } });
    expect(t.dueDate).toBe("2026-10-16");
    ctx.clock.set("2027-02-15T02:00:00Z");
    expect((await upcomingDeadlines(ctx, { clientId: "cli_tw1", withinDays: 60 })).find((d) => d.key === "TW221")).toMatchObject({ dueDate: "2027-03-31", periodKey: "TW221:2027" });
  });
});

describe("Macau", () => {
  it("a quota transfer updates the quota holders register", async () => {
    ctx.llm.on("structure", { items: [{ kind: "transfer", fromPersonId: "per_mo_b", fromName: "Maria Ferreira", toPersonId: "per_p2", toName: "LEE Siu Ling", toNameZh: null, className: "Quota", quantity: 12500, pricePerShareCents: null, considerationCents: 5000000 }] });
    const t = await toRegister("cli_mo1", "mo.quotaTransfer", { moQuotaTransfer: { value: "Maria Ferreira transfers her MOP 12,500 quota to LEE Siu Ling for MOP 50,000" }, moResolution: { value: "acta" }, effDate: { value: "2026-10-10" } });
    const [reg] = await pendingProposals(ctx, { taskId: t.id, kind: "register_change" });
    await approveProposal(ctx, reg.id);
    expect((await membersAsAt(ctx, "cli_mo1", "2026-10-10")).map((m) => [m.name, m.quantity])).toEqual([["LEE Siu Ling", 25000]]);
  });
});

describe("Intake catalogue", () => {
  it("jurisdiction playbooks are offered only for clients in that jurisdiction", async () => {
    const cn = (await playbookCatalogue(ctx, ["HK", "CN"])).map((p) => p.playbookId);
    expect(cn).toContain("cn.changeLegalRep");
    expect(cn).not.toContain("tw.changeDirectors");
  });
});
