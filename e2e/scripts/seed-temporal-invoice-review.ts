// Fresh real legacy recovery for each breakpoint; no invoice/step rewrites to skip approval.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { makeRuntimeCtx } from "../../src/lib/runtime";
import { FixedClock } from "../../src/lib/clock";
import { closePools } from "../../src/db/client";
import { startManualRequest } from "../../src/domain/manual";
import { approveProposal, getProposal, resolveInterruptedProposal } from "../../src/domain/proposals";
import { invoiceForRequest } from "../../src/domain/outbound";
import { deliveryPayload } from "../../src/domain/mail-delivery";
import { client, contact, mailDelivery } from "../../src/db/schema";
import { Crypto } from "../../src/lib/crypto";
if (!process.env.DATABASE_URL?.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e") throw new Error("Date recovery requires private E2E and fake providers");
const ctx = { ...makeRuntimeCtx(), clock: new FixedClock(new Date("2026-09-29T15:59:59Z")) };
const cases = [];
for (const [language, clientId] of [["en", "cli_c1"], ["tc", "cli_c2"], ["sc", "cli_c3"]] as const) {
  ctx.clock.set("2026-09-29T15:59:59Z");
  await ctx.db.update(client).set({ paymentTermsDays: 30, messageLang: language }).where(eq(client.id, clientId));
  await ctx.db.update(contact).set({ language, email: `${language}-fictional@audit.example` }).where(eq(contact.clientId, clientId));
  const r = await startManualRequest(ctx, { clientId, items: [{ playbookId: "hk.changeOffice" }], confirm: true });
  const inv = (await invoiceForRequest(ctx, r.requestId))!;
  const transport = ctx.mail.send.bind(ctx.mail);
  ctx.mail.send = async mail => { await transport(mail); throw new Error("Fake accepted original legacy invoice; acknowledgement lost"); };
  await assert.rejects(approveProposal(ctx, r.proposalId!), /delivery needs review/i);
  ctx.mail.send = transport; ctx.clock.set("2026-09-30T02:00:00Z");
  const p = await getProposal(ctx, r.proposalId!);
  const journal = (await ctx.db.query.mailDelivery.findFirst({ where: eq(mailDelivery.sourceKey, `message:${p.payload.messageId}`) }))!;
  const original = deliveryPayload(ctx, journal).attachments![0];
  // Emulate an actual pre-upgrade encrypted journal, retaining exact PDF and acceptance.
  const saved = JSON.parse(ctx.crypto.decrypt(journal.payload)); delete saved.invoiceDates;
  const plain = JSON.stringify(saved);
  await ctx.db.update(mailDelivery).set({ payload: ctx.crypto.encrypt(plain), payloadHash: Crypto.sha256(plain) }).where(eq(mailDelivery.id, journal.id));
  const fresh = (await resolveInterruptedProposal(ctx, p.id, { checkedMailbox: true, note: "Original delivered PDF confirmed; its dates need explicit review" }))!;
  await assert.rejects(approveProposal(ctx, fresh.id, { edits: { completedOutside: "on", note: "Complete the original delivery without another message" } }), /date|review/i);
  assert.equal((await getProposal(ctx, fresh.id)).status, "recovery");
  cases.push({ language, proposalId: fresh.id, invoiceId: inv.id, taskId: r.taskIds[0], originalProposalId: p.id,
    journalId: journal.id, correlationId: journal.correlationId, pdfSha256: Crypto.sha256(original.content), issuedOn: "2026-09-29", dueOn: "2026-10-29" });
}
writeFileSync(path.join(process.env.STORAGE_DIR!, "temporal-invoice-cases.json"), JSON.stringify(cases));
await closePools();
