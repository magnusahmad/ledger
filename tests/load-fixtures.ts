// Frozen Area10 seed 20261003. Background rows preserve valid pinned workflow
// snapshots; selected operations use real public domain functions.
import { eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { task, taskEvent, conversation, message, mailItem, bankTransaction } from "@/db/schema";
import { seedDemo } from "@/db/seed-demo";
import { allPlaybookFiles, getPlaybook, savePlaybookVersion } from "@/domain/playbooks";
import { startTask, advance, createRequest } from "@/domain/engine";
import { createInvoiceForRequest } from "@/domain/invoices";
import { completeManualStep } from "@/domain/step-hooks";
import { putOnHold } from "@/domain/off-platform";

export const LOAD_SEED = 20261003;
export const loadTitles = ["Fictional original review", "虛構原件覆核", "虚构原件复核"];
export async function seedLoad(ctx: Ctx, options: { seeded?: boolean } = {}) {
  if (!options.seeded) await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  const original = { ...allPlaybookFiles().find(p => p.id === "hk.changeOffice")!, version: (await getPlaybook(ctx, "hk.changeOffice")).version };
  const manual = await savePlaybookVersion(ctx, original.id, original.version, JSON.stringify({ ...original, deadline: { kind: "none" }, documents: [], forms: "", requirements: [], registerEffects: [], steps: [{ kind: "task", label: "Review original evidence / 覆核原件 / 复核原件", human: true }] }));
  const oldManual = await startTask(ctx, { clientId: "cli_c1", playbookId: manual.id, title: "LOAD oldest original manual gate", dueDate: "2026-10-01" });
  const held = await startTask(ctx, { clientId: "cli_c1", playbookId: manual.id, title: "LOAD oldest held original gate" });
  await putOnHold(ctx, held.id, { reason: "Await original bank evidence / 等候銀行原件 / 等候银行原件", waitingOn: "us", followUpOn: "2026-10-04" });
  const done = await startTask(ctx, { clientId: "cli_c1", playbookId: manual.id, title: "LOAD completed original review" });
  await completeManualStep(ctx, done.id, "Fictional original reviewed by staff");
  const collect = await savePlaybookVersion(ctx, manual.id, manual.version, JSON.stringify({ ...manual, requirements: [{ key: "newAddr" }], steps: [{ kind: "collect", label: "Client supplies new address" }, { kind: "task", label: "Staff verifies original", human: true }] }));
  const collecting = await startTask(ctx, { clientId: "cli_c1", playbookId: collect.id, title: "LOAD original collecting task" });
  const templates = await ctx.db.select().from(task).where(eq(task.clientId, "cli_c1"));
  const get = (id: string) => templates.find(t => t.id === id)!;
  const strata = [{ name: "manual", n: 600, row: get(oldManual.id) }, { name: "collect", n: 600, row: get(collecting.id) }, { name: "held", n: 600, row: get(held.id) }, { name: "done", n: 400, row: get(done.id) }];
  for (const s of strata) for (let at = 0; at < s.n; at += 200) {
    const rows = Array.from({ length: Math.min(200, s.n - at) }, (_, offset) => {
      const i = at + offset; return { ...s.row, id: `load-${s.name}-${i}`, title: `${loadTitles[i % 3]} ${s.name} ${i}`, createdAt: new Date(ctx.clock.now().getTime() + 1000 + i) };
    });
    await ctx.db.insert(task).values(rows);
    await ctx.db.insert(taskEvent).values(rows.map(row => ({ id: `load-event-${row.id}`, firmId: ctx.firmId, taskId: row.id, kind: "task.created", summary: "Valid workflow snapshot, fictional load corpus", actor: "system", at: row.createdAt })));
  }
  // Two genuine selected minority states: a prepared (unsent) signing pack and
  // an upfront task with its actual draft invoice. No fabricated completion.
  const signingPb = await savePlaybookVersion(ctx, collect.id, collect.version, JSON.stringify({ ...collect, requirements: [{ key: "newAddr" }, { key: "effDate" }], documents: original.documents.filter(d => d.template === "tpl:board-resolution"), steps: [{ kind: "collect", label: "Confirm address" }, { kind: "generate", label: "Prepare reviewed resolution" }, { kind: "sign", label: "Staff approve invitation", human: true }, { kind: "file", label: "Staff records authority reference", human: true }] }));
  const signing = await startTask(ctx, { clientId: "cli_c1", playbookId: signingPb.id, extracted: { newAddr: { value: "Unit 10, Fictional Load Road" }, effDate: { value: ctx.clock.today() } }, title: "LOAD genuine unsent signing anchor" });
  await advance(ctx, signing.id);
  const payingPb = await savePlaybookVersion(ctx, signingPb.id, signingPb.version, JSON.stringify({ ...collect, version: signingPb.version, requirements: [], documents: [], steps: [{ kind: "pay", label: "Await actual upfront payment" }, { kind: "task", label: "Staff review", human: true }] }));
  const req = await createRequest(ctx, { clientId: "cli_c2", summary: "Fictional actual upfront service" });
  const paying = await startTask(ctx, { clientId: "cli_c2", requestId: req.id, playbookId: payingPb.id, title: "LOAD genuine awaiting payment anchor" });
  const quote = await createInvoiceForRequest(ctx, req.id); await advance(ctx, paying.id);
  // Feed/list history uses fictional retained records, not fabricated completion.
  for (let at = 0; at < 230; at += 100) {
    const indices = Array.from({ length: Math.min(100, 230 - at) }, (_, i) => at + i);
    await ctx.db.insert(conversation).values(indices.map(i => ({ id: `load-conversation-${i}`, firmId: ctx.firmId, clientId: "cli_c1", channel: "email" as const, subject: `${loadTitles[i % 3]} history ${i}`, lastMessageAt: new Date(ctx.clock.now().getTime() + i), createdAt: new Date(ctx.clock.now().getTime() + i) })));
    await ctx.db.insert(message).values(indices.map(i => ({ id: `load-message-${i}`, firmId: ctx.firmId, conversationId: `load-conversation-${i}`, direction: "in" as const, status: "received" as const, subject: `Original fictional history ${i}`, text: "Original retained message, no instructions to act", processedAt: ctx.clock.now(), at: new Date(ctx.clock.now().getTime() + i) })));
    await ctx.db.insert(mailItem).values(indices.map(i => ({ id: `load-mail-${i}`, firmId: ctx.firmId, clientId: "cli_c1", receivedOn: "2026-10-03", sender: "Fictional Registry", summary: `${loadTitles[i % 3]} original letter ${i}`, createdAt: new Date(ctx.clock.now().getTime() + i) })));
    await ctx.db.insert(bankTransaction).values(indices.map(i => ({ id: `load-deposit-${i}`, firmId: ctx.firmId, provider: "fake", providerTxId: `load-provider-${i}`, amountCents: 10000 + i, currency: "HKD", reference: `Original unallocated deposit ${i}`, payerName: `Fictional payer ${i}`, receivedAt: new Date(ctx.clock.now().getTime() + i), status: "unmatched" as const })));
  }
  return { seed: LOAD_SEED, strata: strata.map(({ name, n }) => ({ name, n })), backgroundTasks: 2200, oldManual: oldManual.id, held: held.id, collecting: collecting.id, signing: signing.id, paying: paying.id, invoiceId: quote!.id, manualVersion: manual.version, collectVersion: collect.version, retainedConversations: 230, retainedMail: 230, deposits: 230 };
}
