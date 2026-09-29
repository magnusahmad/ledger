// The client's secure upload link (/u/<token>): shows what is still needed per task in the
// client's language, accepts files and typed details, and ticks the checklist.
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { sameValue } from "./names";
import { client as clientT, document, request as requestT, task as taskT, type Lang } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { advance, getTask, logEvent, outstanding, setChecklist, tasksForRequest } from "./engine";
import { getPlaybook } from "./playbooks";
import { itemLabel, itemKind } from "./labels";
import { getPersonProtected, updatePerson } from "./records";
import { createProposal } from "./proposals";
import { extractFromDocument } from "@/agent/extract";
import { AgentError } from "@/agent/call";

export class PortalError extends Error {}

async function requestByToken(ctx: Ctx, token: string) {
  const r = await ctx.db.query.request.findFirst({ where: and(eq(requestT.uploadToken, token), eq(requestT.firmId, ctx.firmId)) });
  if (!r) throw new PortalError("This link isn't valid");
  return r;
}

export async function portalView(ctx: Ctx, token: string, langOverride?: Lang) {
  const r = await requestByToken(ctx, token);
  const cl = (await ctx.db.query.client.findFirst({ where: eq(clientT.id, r.clientId) }))!;
  const lang = langOverride ?? cl.messageLang;
  const tasks = (await tasksForRequest(ctx, r.id)).filter((t) => t.status === "open");
  const out = [];
  for (const t0 of tasks) {
    const t = await getTask(ctx, t0.id);
    const pb = await getPlaybook(ctx, t.playbookId, t.playbookVersion);
    const person = t.personId ? await ctx.db.query.person.findFirst({ where: (p, { eq }) => eq(p.id, t.personId!) }) : null;
    out.push({
      taskId: t.id, title: (pb.name[lang] ?? pb.name.en) + (person ? ` · ${person.nameZh && lang !== "en" ? person.nameZh : person.nameEn}` : ""),
      items: t.checklist.filter((e) => e.status === "needed" || e.status === "received").map((e) => ({
        key: e.key, personId: e.personId ?? null, label: itemLabel(e.key, lang, t.params), kind: itemKind(e.key, t.params),
        status: e.status, optional: !!e.optional, value: e.status === "received" && e.value && !["idNo", "resAddr"].includes(e.key) ? e.value : null,
      })),
      remaining: outstanding(t).length,
    });
  }
  return { clientName: (lang === "tc" ? cl.nameTc : lang === "sc" ? cl.nameSc : null) ?? cl.nameEn, language: lang, tasks: out };
}

async function taskInRequest(ctx: Ctx, token: string, taskId: string) {
  const r = await requestByToken(ctx, token);
  const t = await ctx.db.query.task.findFirst({ where: and(eq(taskT.id, taskId), eq(taskT.requestId, r.id)) });
  if (!t || t.status !== "open") throw new PortalError("That item isn't part of this request");
  return { r, t: await getTask(ctx, taskId) };
}

const PERSON_FIELD: Record<string, "nameEn" | "nameZh" | "idNumber" | "residentialAddress" | "correspondenceAddress"> = { fullName: "nameEn", chiName: "nameZh", idNo: "idNumber", resAddr: "residentialAddress", corrAddr: "correspondenceAddress" };

export async function portalUpload(ctx: Ctx, token: string, u: { taskId: string; key: string; filename: string; mime: string; content: Buffer }) {
  const { t } = await taskInRequest(ctx, token, u.taskId);
  const entry = t.checklist.find((e) => e.key === u.key && (!e.personId || e.personId === t.personId));
  if (!entry) throw new PortalError("That item isn't needed for this task");
  if (u.content.length > 15 * 1024 * 1024) throw new PortalError("Files must be under 15 MB");
  const id = ctx.ids.next("doc");
  const key = `uploads/${t.clientId}/${id}-${u.filename.replace(/[^\w.\-]/g, "_")}`;
  await ctx.storage.put(key, u.content);
  await ctx.db.insert(document).values({ id, firmId: ctx.firmId, clientId: t.clientId, taskId: t.id, personId: entry.personId ?? null, kind: u.key === "idCopy" ? "id_copy" : u.key === "addrProof" ? "address_proof" : u.key === "selfie" ? "selfie" : "upload", title: u.filename, storageKey: key, mime: u.mime, sha256: Crypto.sha256(u.content), source: "upload", requirementKey: u.key, createdAt: ctx.clock.now() });
  const next = t.checklist.map((e) => e === entry ? { ...e, status: "received" as const, documentId: id, source: "Uploaded through the secure link" } : e);
  await setChecklist(ctx, t.id, next, `Client uploaded ${itemLabel(u.key)}`, "client");
  await logEvent(ctx, t.id, "portal.upload", `Client uploaded ${u.filename} for ${itemLabel(u.key)}`, { documentId: id }, "client");

  // Read the document for details that fill other checklist items (never on the selfie).
  if (u.key !== "selfie" && t.personId && (u.mime.startsWith("image/") || u.mime === "application/pdf")) {
    const person = await getPersonProtected(ctx, t.personId);
    const want = t.checklist.filter((e) => e.personId === t.personId && PERSON_FIELD[e.key]).map((e) => e.key);
    try {
      const ex = await extractFromDocument(ctx, { taskId: t.id, forKey: u.key, wantKeys: want, filename: u.filename, mime: u.mime, content: u.content,
        onFile: Object.fromEntries(Object.entries(PERSON_FIELD).map(([k, f]) => [k, (person as Record<string, unknown>)[f] as string | null])) });
      await applyExtraction(ctx, t.id, t.personId, ex.fields, u.filename);
    } catch (e) { if (!(e instanceof AgentError)) throw e; await logEvent(ctx, t.id, "extract.failed", `Couldn't read ${u.filename}; staff can enter the details`); }
  }
  return advance(ctx, t.id);
}

async function applyExtraction(ctx: Ctx, taskId: string, personId: string, fields: { key: string; value: string; quote: string | null }[], source: string) {
  const person = await getPersonProtected(ctx, personId);
  const t = await getTask(ctx, taskId);
  const patch: Record<string, string> = {};
  let next = t.checklist;
  for (const f of fields) {
    const field = PERSON_FIELD[f.key];
    if (!field || !f.value) continue;
    const onFile = (person as Record<string, unknown>)[field] as string | null;
    if (onFile && !sameValue(onFile, f.value)) {
      await createProposal(ctx, { kind: "conflict", title: `Conflicting ${itemLabel(f.key)} for ${person.nameEn}`, summary: `Our records and ${source} differ.`, clientId: t.clientId, taskId, payload: { taskId, key: f.key, onFile: ["idNo", "resAddr"].includes(f.key) ? "(protected value on file)" : onFile, incoming: f.value, personId, question: `Please confirm your ${itemLabel(f.key).toLowerCase()}.` } });
      continue;
    }
    if (!onFile) patch[field] = f.value;
    next = next.map((e) => e.key === f.key && e.personId === personId && e.status === "needed" ? { ...e, status: "received" as const, value: ["idNo", "resAddr"].includes(f.key) ? "Provided" : f.value, source } : e);
  }
  if (Object.keys(patch).length) await updatePerson(ctx, personId, patch, `Read from ${source}`);
  await setChecklist(ctx, taskId, next, `Details read from ${source}`, "agent");
}

export async function portalSubmitField(ctx: Ctx, token: string, f: { taskId: string; key: string; value: string }) {
  const { t } = await taskInRequest(ctx, token, f.taskId);
  const value = f.value.trim();
  if (!value) throw new PortalError("Enter a value");
  const entry = t.checklist.find((e) => e.key === f.key && (!e.personId || e.personId === t.personId));
  if (!entry) throw new PortalError("That item isn't needed for this task");
  if (entry.personId && PERSON_FIELD[f.key]) {
    const person = await getPersonProtected(ctx, entry.personId);
    if (!(person as Record<string, unknown>)[PERSON_FIELD[f.key]]) await updatePerson(ctx, entry.personId, { [PERSON_FIELD[f.key]]: value }, "Entered by the client on the secure link");
  }
  const next = t.checklist.map((e) => e === entry ? { ...e, status: "received" as const, value: ["idNo", "resAddr"].includes(f.key) ? "Provided" : value, source: "Entered on the secure link" } : e);
  await setChecklist(ctx, t.id, next, `Client entered ${itemLabel(f.key)}`, "client");
  return advance(ctx, t.id);
}
