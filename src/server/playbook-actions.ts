"use server";
import { revalidatePath } from "next/cache";
import { getCtx } from "./ctx";
import { savePlaybookVersion } from "@/domain/playbooks";

export type PlaybookSaveResult = { error?: string; message?: string; version?: number; json?: string };
export async function savePlaybookAction(_previous: PlaybookSaveResult | null, form: FormData): Promise<PlaybookSaveResult> {
  try {
    const saved = await savePlaybookVersion(getCtx(), String(form.get("id") ?? ""), Number(form.get("version")), String(form.get("definition") ?? ""));
    revalidatePath("/playbooks");
    return { message: `Saved version ${saved.version}. New tasks use this version; existing tasks keep theirs.`, version: saved.version, json: JSON.stringify(saved, null, 2) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the playbook." };
  }
}
