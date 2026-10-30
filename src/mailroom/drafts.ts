// Where approved client emails go: always a draft for staff to send, never sent by us.
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OutboundMail } from "@/integrations/types";
import { buildRaw } from "@/integrations/mail/mime";

export interface DraftBox {
  readonly name: string;
  /** Saves a draft and returns a reference that can remove it again. */
  save(m: OutboundMail): Promise<string>;
  remove(ref: string): Promise<void>;
}

export class MemoryDraftBox implements DraftBox {
  readonly name = "memory";
  private drafts = new Map<string, OutboundMail>();
  all() { return [...this.drafts.values()]; }
  async save(m: OutboundMail) { const ref = randomUUID(); this.drafts.set(ref, m); return ref; }
  async remove(ref: string) { this.drafts.delete(ref); }
}

/** .eml files with X-Unsent: 1, which Outlook opens as an unsent draft ready to send. */
export class EmlDraftBox implements DraftBox {
  readonly name = "eml";
  constructor(private dir: string, private from: string) {}
  async save(m: OutboundMail) {
    await mkdir(this.dir, { recursive: true });
    const ref = `${new Date().toISOString().slice(0, 10)} ${m.subject.replace(/[\\/:*?"<>|]/g, " ").slice(0, 60).trim()} ${randomUUID().slice(0, 6)}.eml`;
    const raw = await buildRaw(this.from, m);
    await writeFile(path.join(this.dir, ref), Buffer.concat([Buffer.from("X-Unsent: 1\r\n"), raw]), { flag: "wx" });
    return ref;
  }
  async remove(ref: string) {
    if (ref.includes("/") || ref.includes("\\")) throw new Error("Bad draft reference");
    await unlink(path.join(this.dir, ref)).catch((e: NodeJS.ErrnoException) => { if (e.code !== "ENOENT") throw e; });
  }
}

/** Drafts in a Gmail mailbox (the demo mailbox), through the connected Gmail account. */
export class GmailDraftBox implements DraftBox {
  readonly name = "gmail";
  constructor(private api: { createDraft(m: OutboundMail): Promise<string>; deleteDraft(id: string): Promise<void> }) {}
  save(m: OutboundMail) { return this.api.createDraft(m); }
  remove(ref: string) { return this.api.deleteDraft(ref); }
}
