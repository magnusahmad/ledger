// The client's secure upload link (/u/<token>): shows what is still needed per task in the
// client's language, accepts files and typed details, and ticks the checklist.
import { and, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { knownPersonName, sameValue } from "./names";
import { client as clientT, document, request as requestT, task as taskT, type Lang } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { advance, assertTaskAmendable, getTask, logEvent, outstanding, setChecklist, tasksForRequest, type Task } from "./engine";
import { getPlaybook } from "./playbooks";
import { itemLabel, itemKind } from "./labels";
import { compatibleContactInfo, contactInfoPatch, getPersonProtected, updatePerson } from "./records";
import { createProposal } from "./proposals";
import { extractFromDocument } from "@/agent/extract";
import { isIsoDate } from "./dates";
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
      taskId: t.id, title: (pb.name[lang] ?? pb.name.en) + (person && pb.category !== "New client onboarding" ? ` · ${person.nameZh && lang !== "en" ? person.nameZh : person.nameEn}` : ""),
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
  const [t] = await ctx.db.select().from(taskT).where(and(eq(taskT.id, taskId), eq(taskT.requestId, r.id), eq(taskT.firmId, ctx.firmId))).for("update");
  if (!t || t.status !== "open") throw new PortalError("That item isn't part of this request");
  return { r, t: await assertTaskAmendable(ctx, taskId) };
}

type PortalItem = { taskId: string; key: string; expectedPersonId?: string | null };
function assertRenderedPerson(t: Task, item: PortalItem) {
  const entry = t.checklist.find(e => e.key === item.key && (!e.personId || e.personId === t.personId));
  if (item.expectedPersonId !== undefined && item.expectedPersonId !== (entry?.personId ?? null)) throw new PortalError("The person for this item changed. Refresh this link before sending.");
}

const PERSON_FIELD: Record<string, "nameEn" | "nameZh" | "idNumber" | "residentialAddress" | "correspondenceAddress"> = { fullName: "nameEn", chiName: "nameZh", idNo: "idNumber", resAddr: "residentialAddress", corrAddr: "correspondenceAddress" };

export async function portalUpload(ctx: Ctx, token: string, u: PortalItem & { filename: string; mime: string; content: Buffer }) {
  return ctx.db.transaction(async db => portalUploadAtomic({ ...ctx, db: db as unknown as Ctx["db"] }, token, u));
}

async function portalUploadAtomic(ctx: Ctx, token: string, u: Parameters<typeof portalUpload>[2]) {
  const { t } = await taskInRequest(ctx, token, u.taskId);
  assertRenderedPerson(t, u);
  const entry = t.checklist.find((e) => e.key === u.key && (!e.personId || e.personId === t.personId));
  if (!entry) throw new PortalError("That item isn't needed for this task");
  if (itemKind(u.key, t.params) !== "file") throw new PortalError("Enter a typed value for this item; it does not accept a file upload");
  if (u.content.length > 15 * 1024 * 1024) throw new PortalError("Files must be under 15 MB");
  if (!u.content.length) throw new PortalError("Choose a file with readable content");
  const id = ctx.ids.next("doc");
  // Display names are metadata; object keys must not inherit filesystem limits.
  const key = `uploads/${t.clientId}/${id}`;
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
        onFile: Object.fromEntries(Object.entries(PERSON_FIELD).map(([k, f]) => [k, f === "nameEn" ? knownPersonName(person.nameEn) : (person as Record<string, unknown>)[f] as string | null])) });
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
    if (!field || !f.value || t.personId !== personId || !t.checklist.some(e => e.key === f.key && e.personId === personId)) continue;
    const stored = (person as Record<string, unknown>)[field] as string | null;
    const onFile = field === "nameEn" ? knownPersonName(stored) : stored;
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

export async function portalSubmitField(ctx: Ctx, token: string, f: PortalItem & { value: string }) {
  return ctx.db.transaction(async db => portalSubmitFieldAtomic({ ...ctx, db: db as unknown as Ctx["db"] }, token, f));
}

async function portalSubmitFieldAtomic(ctx: Ctx, token: string, f: Parameters<typeof portalSubmitField>[2]) {
  const { t } = await taskInRequest(ctx, token, f.taskId);
  assertRenderedPerson(t, f);
  const value = f.value.trim();
  if (!value) throw new PortalError("Enter a value");
  if (itemKind(f.key, t.params) === "file") throw new PortalError("Upload a document for this item");
  if ((/Date$|^lastDay$/.test(f.key) && !isIsoDate(value)) || value.includes("\u0000")) throw new PortalError("Enter a valid date or value");
  const entry = t.checklist.find((e) => e.key === f.key && (!e.personId || e.personId === t.personId));
  if (!entry) throw new PortalError("That item isn't needed for this task");
  if (entry.personId && PERSON_FIELD[f.key]) {
    const person = await getPersonProtected(ctx, entry.personId);
    if (!(person as Record<string, unknown>)[PERSON_FIELD[f.key]]) await updatePerson(ctx, entry.personId, { [PERSON_FIELD[f.key]]: value }, "Entered by the client on the secure link");
  }
  let saved = value;
  if (entry.personId && f.key === "contactInfo") {
    const person = await getPersonProtected(ctx, entry.personId);
    const onFile = [person.email, person.phone].filter(Boolean).join(" / ");
    const patch = contactInfoPatch(value, person);
    if (Object.keys(patch).length) await updatePerson(ctx, entry.personId, patch, "Entered by the client on the secure link");
    // A client asked for the missing half types only that half: the item is the email and mobile
    // together, so join it with what is on file. A value that differs from the record stays as typed.
    if (onFile && compatibleContactInfo(onFile, value)) saved = [person.email ?? patch.email, person.phone ?? patch.phone].filter(Boolean).join(" / ");
  }
  const next = t.checklist.map((e) => e === entry ? { ...e, status: "received" as const, value: ["idNo", "resAddr"].includes(f.key) ? "Provided" : saved, source: "Entered on the secure link" } : e);
  await setChecklist(ctx, t.id, next, `Client entered ${itemLabel(f.key)}`, "client");
  return advance(ctx, t.id);
}

/** One submission from the upload link: every filled detail and file at once. Blank items stay outstanding. */
export async function portalSubmit(ctx: Ctx, token: string, s: { fields: (PortalItem & { value: string })[]; files: (PortalItem & { filename: string; mime: string; content: Buffer })[] }) {
  if (s.files.some(f => f.content.length > 15 * 1024 * 1024)) throw new PortalError("Files must be under 15 MB");
  return ctx.db.transaction(async db => portalSubmitAtomic({ ...ctx, db: db as unknown as Ctx["db"] }, token, s));
}

async function portalSubmitAtomic(ctx: Ctx, token: string, s: Parameters<typeof portalSubmit>[2]) {
  const fields = s.fields.filter((f) => f.value.trim());
  const files = s.files.filter((f) => f.content.length);
  if (!fields.length && !files.length) throw new PortalError("Fill in at least one item before sending");
  // Check everything belongs to this link's request before saving any of it.
  for (const x of [...fields, ...files]) {
    const { t } = await taskInRequest(ctx, token, x.taskId);
    assertRenderedPerson(t, x);
    if (!t.checklist.some((e) => e.key === x.key && (!e.personId || e.personId === t.personId))) throw new PortalError("That item isn't needed for this task");
  }
  for (const f of fields) {
    const { t } = await taskInRequest(ctx, token, f.taskId);
    if (itemKind(f.key, t.params) === "file") throw new PortalError("Upload a document for this item");
  }
  for (const f of files) {
    const { t } = await taskInRequest(ctx, token, f.taskId);
    if (itemKind(f.key, t.params) !== "file") throw new PortalError("Enter a typed value for this item; it does not accept a file upload");
  }
  for (const f of fields) await portalSubmitField(ctx, token, f);
  for (const f of files) await portalUpload(ctx, token, f);
  return { saved: fields.length + files.length };
}
