// An emailed signing link refers to one human-approved pack, never the task's
// latest generation pointers. The encrypted approval is its immutable source.
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { document, mailDelivery, proposal, signEnvelope, signer } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import type { ApprovedInput } from "./approval-execution";
import type { Proposal } from "./proposals";
import { getTask, stepData } from "./engine";

export type SignatureField = { field: string; page: number; x: number; y: number; w: number; h: number };
export type SigningDocumentSnapshot = Pick<typeof document.$inferSelect, "id" | "title" | "sha256" | "storageKey" | "clientId" | "taskId" | "personId" | "kind" | "language"> & { fields: SignatureField[] };
type ExpectedSigner = { personId: string; name: string; email: string | null; role: string; docIds: string[] };
const sameIds = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

export async function approvedSigningPack(ctx: Ctx, env: typeof signEnvelope.$inferSelect, known?: ApprovedInput) {
  const t = await getTask(ctx, env.taskId);
  let input = known;
  if (!input) {
    const cards = await ctx.db.select().from(proposal).where(and(eq(proposal.firmId, ctx.firmId), eq(proposal.taskId, t.id), eq(proposal.kind, "send_signing")));
    for (const card of cards) {
      if (!card.approvedInput) continue;
      const captured = JSON.parse(ctx.crypto.decrypt(card.approvedInput)) as ApprovedInput;
      if (captured.payload.envelopeId === env.id) { input = captured; break; }
    }
  }
  const snapshots = input?.signingDocuments;
  if (!input || input.payload.envelopeId !== env.id || !snapshots?.length || !sameIds(env.documentIds, snapshots.map(d => d.id))) throw new Error("The approved signing documents changed or their original snapshot is unavailable; ask staff to review a new pack");
  const documents = [];
  for (const id of env.documentIds) {
    const saved = snapshots.find(d => d.id === id)!;
    if (!saved.storageKey || !saved.sha256 || !Array.isArray(saved.fields) || saved.taskId !== t.id || saved.clientId !== t.clientId) throw new Error("The approved signing document context is unavailable; ask staff to review a new pack");
    const row = await ctx.db.query.document.findFirst({ where: and(eq(document.id, id), eq(document.firmId, ctx.firmId), eq(document.taskId, t.id), eq(document.clientId, t.clientId)) });
    if (!row || row.storageKey !== saved.storageKey || row.sha256 !== saved.sha256) throw new Error("The approved signing document changed; its integrity must be checked before signing");
    documents.push({ ...row, ...saved });
  }
  return { input, task: t, documents };
}

export function approvedSignerDocuments(pack: Awaited<ReturnType<typeof approvedSigningPack>>, row: typeof signer.$inferSelect) {
  const expected = (pack.input.payload.signers as ExpectedSigner[] | undefined)?.find(s => s.personId === row.personId);
  const emails = pack.input.opts.edits?.emails as Record<string, string> | undefined;
  if (!expected || expected.name !== row.name || (emails?.[expected.personId] ?? expected.email) !== row.email || expected.role !== row.role) throw new Error("The approved signing recipient changed; ask staff to review the pack");
  return pack.documents.filter(d => expected.docIds.includes(d.id));
}

export async function signingOriginalBytes(ctx: Ctx, docs: Awaited<ReturnType<typeof approvedSigningPack>>["documents"]) {
  const originals = [];
  for (const doc of docs) {
    const bytes = await ctx.storage.get(doc.storageKey!);
    if (Crypto.sha256(bytes) !== doc.sha256) throw new Error("The approved document bytes changed; the original PDF hash does not match");
    originals.push({ document: doc, bytes });
  }
  return originals;
}

/** Only our own completed signing progress can explain a changed execution
 * digest. All invitations must already have positive durable provider proof. */
export async function completedSigningProof(ctx: Ctx, p: Proposal, input: ApprovedInput) {
  if (p.kind !== "send_signing" || !p.taskId) return false;
  const envId = input.payload.envelopeId as string;
  const env = await ctx.db.query.signEnvelope.findFirst({ where: and(eq(signEnvelope.id, envId), eq(signEnvelope.firmId, ctx.firmId), eq(signEnvelope.taskId, p.taskId)) });
  if (!env || env.status !== "completed") return false;
  const pack = await approvedSigningPack(ctx, env, input);
  const t = pack.task;
  const index = t._steps.findIndex(s => s.kind === "sign");
  const state = stepData(t, index);
  if (t.status !== "open" || t.stepIndex !== index + 1 || state.signed !== true || state.envelopeId !== env.id || !sameIds(state.signedDocumentIds as string[] ?? [], env.signedDocumentIds) || env.signedDocumentIds.length !== env.documentIds.length) return false;
  const expected = input.payload.signers as ExpectedSigner[];
  const recipients = await ctx.db.select().from(signer).where(and(eq(signer.firmId, ctx.firmId), eq(signer.envelopeId, env.id)));
  if (!expected?.length || recipients.length !== expected.length) return false;
  for (const recipient of recipients) {
    approvedSignerDocuments(pack, recipient);
    if (!recipient.signedAt || !recipient.otpVerifiedAt) return false;
    const invitation = await ctx.db.query.mailDelivery.findFirst({ where: and(eq(mailDelivery.firmId, ctx.firmId), eq(mailDelivery.sourceKey, `signer:${env.id}:${recipient.personId}`)) });
    if (invitation?.status !== "sent" || !invitation.result?.providerMessageId) return false;
  }
  await signingOriginalBytes(ctx, pack.documents);
  for (let i = 0; i < env.signedDocumentIds.length; i++) {
    const signed = await ctx.db.query.document.findFirst({ where: and(eq(document.id, env.signedDocumentIds[i]), eq(document.firmId, ctx.firmId), eq(document.taskId, t.id), eq(document.clientId, t.clientId), eq(document.source, "signed")) });
    if (!signed?.storageKey || !signed.sha256 || !signed.extractedText?.includes(pack.documents[i].sha256!)) return false;
    if (Crypto.sha256(await ctx.storage.get(signed.storageKey)) !== signed.sha256) return false;
  }
  return true;
}
