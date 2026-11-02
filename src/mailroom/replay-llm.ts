// Offline demo: the mail room's model answers for the fictional letter pack are recorded once
// from a live run (MAILROOM_RECORD=1) and replayed, so the demo never depends on office wifi.
// Keys are content hashes: the letter's PDF bytes, or the email facts (without the date).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { LlmProvider, LlmRequest, LlmResponse } from "@/integrations/types";

const MAILROOM = new Set(["mailroom_split", "mailroom_read", "mailroom_email"]);

export function recordingKey(req: LlmRequest): string {
  const user = req.messages.find((m) => m.role === "user");
  let basis = "";
  if (user && typeof user.content !== "string") basis = user.content.map((c) => (c.type === "file" ? c.file.file_data : c.type === "text" ? c.text : "")).join("|");
  else if (user) {
    const text = user.content as string;
    try { const facts = JSON.parse(text.replace(/^FACTS:\n/, "")); delete facts.receivedOn; basis = JSON.stringify(facts); } catch { basis = text; }
  }
  return `${req.agent}-${createHash("sha256").update(basis).digest("hex").slice(0, 24)}`;
}

export class ReplayLlm implements LlmProvider {
  readonly name: string;
  private record: boolean;
  private replay: boolean;
  /** inner answers every other agent; live (if connected) answers mail room scans not recorded.
   *  record: save live answers. replay off: never answer from a recording (a live demo). */
  constructor(private inner: LlmProvider, private live: LlmProvider | null, private dir: string, opts: { record: boolean; replay: boolean }) {
    this.name = `${inner.name}+recordings`;
    this.record = opts.record;
    this.replay = opts.replay;
  }
  async complete(req: LlmRequest): Promise<LlmResponse> {
    if (!MAILROOM.has(req.agent)) return this.inner.complete(req);
    const file = path.join(this.dir, `${recordingKey(req)}.json`);
    if (this.replay && !this.record && existsSync(file)) {
      const json = JSON.parse(readFileSync(file, "utf8"));
      return { json, raw: JSON.stringify(json), model: "recorded" };
    }
    if (!this.live) throw new Error(this.replay ? "This scan isn't one of the recorded demo letters, and no live model is connected." : "Live mode needs the live model: set or_api_key.");
    const res = await this.live.complete(req);
    if (this.record) { mkdirSync(this.dir, { recursive: true }); writeFileSync(file, JSON.stringify(res.json, null, 2) + "\n"); }
    return res;
  }
}
