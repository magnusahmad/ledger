"use server";
// Mail room actions. Filing and drafting happen only in approveLetter (the approval gate).
import { after } from "next/server";
import { refresh } from "next/cache";
import { getMailroom } from "./mailroom";
import type { ActionResult } from "./actions";
import { approveLetter, chooseClient, editLetter, getLetter, ingestScan, lettersFor, notForAClient, processWaiting, undoLetter } from "@/mailroom/service";

const fail = (e: unknown): ActionResult => ({ ok: false, error: (e as Error).message });

export async function uploadScanAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new Error("Choose a scan");
    const { ctx, mr } = getMailroom();
    let added = 0;
    for (const f of files) if (await ingestScan(ctx, mr, { filename: f.name, content: Buffer.from(await f.arrayBuffer()) })) added++;
    after(() => processWaiting(ctx, mr));
    refresh();
    return { ok: true, message: added ? "Reading the scan…" : "That scan is already here." };
  } catch (e) { return fail(e); }
}

/** The next letter in the batch still waiting for review, after this one. */
async function nextUrl(batchId: string, afterSeq: number) {
  const { ctx } = getMailroom();
  const ls = await lettersFor(ctx, batchId);
  const next = ls.find((l) => l.status === "proposed" && l.seq > afterSeq) ?? ls.find((l) => l.status === "proposed");
  return next ? `/mailroom/${batchId}?l=${next.id}` : `/mailroom/${batchId}/done`;
}

export async function approveAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const { ctx, mr } = getMailroom();
    const id = String(form.get("letterId"));
    await approveLetter(ctx, mr, id);
    const l = await getLetter(ctx, id);
    return { ok: true, redirectTo: await nextUrl(l.batchId, l.seq) };
  } catch (e) { return fail(e); }
}

export async function chooseClientAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const clientId = String(form.get("clientId") ?? "");
    if (!clientId) throw new Error("Choose a client");
    const { ctx, mr } = getMailroom();
    const id = String(form.get("letterId"));
    await chooseClient(ctx, mr, id, clientId);
    const l = await getLetter(ctx, id);
    return { ok: true, redirectTo: `/mailroom/${l.batchId}?l=${id}` };
  } catch (e) { return fail(e); }
}

export async function notForAClientAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const { ctx, mr } = getMailroom();
    const id = String(form.get("letterId"));
    await notForAClient(ctx, mr, id);
    const l = await getLetter(ctx, id);
    return { ok: true, redirectTo: `/mailroom/${l.batchId}?l=${id}` };
  } catch (e) { return fail(e); }
}

export async function editAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const { ctx, mr } = getMailroom();
    const id = String(form.get("letterId"));
    const pick = (k: string) => (form.has(k) ? String(form.get(k)) : undefined);
    await editLetter(ctx, mr, id, { folder: pick("folder"), fileName: pick("fileName"), emailTo: pick("emailTo"), emailSubject: pick("emailSubject"), emailBody: pick("emailBody") });
    const l = await getLetter(ctx, id);
    return { ok: true, redirectTo: `/mailroom/${l.batchId}?l=${id}` };
  } catch (e) { return fail(e); }
}

export async function undoAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    const { ctx, mr } = getMailroom();
    await undoLetter(ctx, mr, String(form.get("letterId")));
    refresh();
    return { ok: true, message: "Undone" };
  } catch (e) { return fail(e); }
}
