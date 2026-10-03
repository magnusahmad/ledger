// Actual human approval, captured PDF, and provider reconciliation across HK midnight.
import { beforeEach, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { goodDraft } from "./agent-fixtures";
import { seedDemo } from "@/db/seed-demo";
import { startManualRequest } from "@/domain/manual";
import { approveProposal, getProposal } from "@/domain/proposals";
import { invoiceForRequest } from "@/domain/outbound";
import { invoiceWithLines } from "@/domain/invoices";
import { deliveryPayload } from "@/domain/mail-delivery";
import { client, mailDelivery } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { addDays, fmtDate } from "@/domain/dates";

let ctx: TestCtx;
beforeEach(async () => {
  await resetDb(); ctx = makeCtx();
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  ctx.llm.on("draft", goodDraft);
});

async function approveAcrossBoundary(before: string, after: string, lostAck: boolean) {
  ctx.clock.set(before);
  const issuedDay = ctx.clock.today();
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }], confirm: true });
  const inv = (await invoiceForRequest(ctx, r.requestId))!;
  expect(inv.status).toBe("draft"); expect(ctx.mail.sent()).toHaveLength(0);
  let acceptedBytes: Buffer | undefined;
  const transport = ctx.mail.send.bind(ctx.mail);
  ctx.mail.send = async outbound => {
    acceptedBytes = Buffer.from(outbound.attachments![0].content);
    const receipt = await transport(outbound);
    ctx.clock.set(after);
    if (lostAck) throw new Error("Fake accepted the year-end PDF; acknowledgement lost");
    return receipt;
  };
  if (lostAck) {
    await expect(approveProposal(ctx, r.proposalId!)).rejects.toThrow(/delivery needs review/i);
    expect((await getProposal(ctx, r.proposalId!)).status).toBe("recovery");
    expect((await invoiceWithLines(ctx, inv.id)).status).toBe("draft");
    ctx.mail.send = transport;
    await approveProposal(ctx, r.proposalId!);
  } else await approveProposal(ctx, r.proposalId!);
  const p = await getProposal(ctx, r.proposalId!);
  const journal = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.sourceKey, `message:${p.payload.messageId}`) }))!;
  const savedBytes = deliveryPayload(ctx, journal).attachments![0].content;
  expect(Crypto.sha256(savedBytes)).toBe(Crypto.sha256(acceptedBytes!));
  expect(ctx.mail.sent()).toHaveLength(1);
  expect(p.status).toBe("approved");
  const printed = execFileSync("pdftotext", ["-layout", "-", "-"], { input: acceptedBytes!, timeout: 10_000 }).toString();
  expect(printed).toContain(fmtDate(issuedDay));
  const final = await invoiceWithLines(ctx, inv.id);
  expect.soft(final.issuedOn, "local issue date must agree with the actual accepted PDF").toBe(issuedDay);
  expect.soft(final.dueOn, "credit days run from the printed issue date, including recovered delivery").toBe(addDays(issuedDay, final.termsDays));
  expect(final.totalCents).toBe(inv.totalCents);
}

it("A10-D01: a PDF accepted just before HK midnight retains its printed issue date after local completion", async () => {
  await approveAcrossBoundary("2026-09-29T15:59:59Z", "2026-09-29T16:00:01Z", false);
}, 120_000);
it("A10-D01: lost-response recovery after HK New Year retains accepted PDF dates and never resends", async () => {
  await approveAcrossBoundary("2026-12-31T15:59:59Z", "2026-12-31T16:00:01Z", true);
}, 120_000);
it("control: same-day approved PDF and invoice use the same issue date and credit-term due date", async () => {
  await approveAcrossBoundary("2026-09-29T02:00:00Z", "2026-09-29T02:00:01Z", false);
}, 120_000);

it("an upfront accepted PDF retains its printed date and same-day due date across midnight", async () => {
  await ctx.db.update(client).set({ paymentTermsDays: 0 }).where(eq(client.id, "cli_c1"));
  await approveAcrossBoundary("2026-09-29T15:59:59Z", "2026-09-29T16:00:01Z", false);
}, 120_000);

it("a legacy accepted invoice journal without captured date provenance requires review without guessing dates or resending", async () => {
  ctx.clock.set("2026-12-31T15:59:59Z");
  const r = await startManualRequest(ctx, { clientId: "cli_c1", items: [{ playbookId: "hk.changeOffice" }], confirm: true });
  const inv = (await invoiceForRequest(ctx, r.requestId))!;
  const transport = ctx.mail.send.bind(ctx.mail);
  ctx.mail.send = async outbound => { await transport(outbound); throw new Error("Accepted old journal; response lost"); };
  await expect(approveProposal(ctx, r.proposalId!)).rejects.toThrow(/delivery needs review/i);
  const p = await getProposal(ctx, r.proposalId!);
  const journal = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.sourceKey, `message:${p.payload.messageId}`) }))!;
  const oldPayload = JSON.parse(ctx.crypto.decrypt(journal.payload));
  delete oldPayload.invoiceDates;
  const plain = JSON.stringify(oldPayload);
  await ctx.db.update(mailDelivery).set({ payload: ctx.crypto.encrypt(plain), payloadHash: Crypto.sha256(plain) }).where(eq(mailDelivery.id, journal.id));
  ctx.clock.set("2027-01-01T03:00:00Z"); ctx.mail.send = transport;
  await expect(approveProposal(ctx, r.proposalId!)).rejects.toThrow(/invoice.*(dates|date|review)|date.*review/i);
  const final = await invoiceWithLines(ctx, inv.id);
  expect(final.status).toBe("draft"); expect(final.issuedOn).toBeNull(); expect(final.dueOn).toBeNull();
  expect(ctx.mail.sent()).toHaveLength(1);
  expect((await getProposal(ctx, r.proposalId!)).status).toBe("recovery");
  const retained = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.id, journal.id) }))!;
  expect(deliveryPayload(ctx, retained).attachments!.map(a => Crypto.sha256(a.content))).toEqual(deliveryPayload(ctx, { ...journal, payload: ctx.crypto.encrypt(plain), payloadHash: Crypto.sha256(plain) }).attachments!.map(a => Crypto.sha256(a.content)));
}, 120_000);
