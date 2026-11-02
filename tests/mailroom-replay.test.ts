// The offline demo replays recorded model answers; a live demo must never use them, so the
// audience sees real inference on the specimen letter.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ReplayLlm, recordingKey } from "@/mailroom/replay-llm";
import { ScriptedLlm } from "@/integrations/llm/scripted";
import type { LlmRequest } from "@/integrations/types";

const req: LlmRequest = { agent: "mailroom_read", schemaName: "mailroom_read", schema: {}, messages: [{ role: "user", content: [{ type: "file", file: { filename: "a.pdf", file_data: "data:application/pdf;base64,QUJD" } }] }] };

let dir: string;
let live: ScriptedLlm;
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "replay-"));
  await writeFile(path.join(dir, `${recordingKey(req)}.json`), JSON.stringify({ from: "recording" }));
  live = new ScriptedLlm().on("mailroom_read", { from: "live model" });
});
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

describe("Recorded answers for the offline demo", () => {
  it("with replay on, a recorded letter is answered from the recording", async () => {
    const llm = new ReplayLlm(new ScriptedLlm(), live, dir, { record: false, replay: true });
    expect((await llm.complete(req)).json).toEqual({ from: "recording" });
    expect(live.calls).toHaveLength(0);
  });

  it("with replay off (a live demo), even a recorded letter goes to the live model", async () => {
    const llm = new ReplayLlm(new ScriptedLlm(), live, dir, { record: false, replay: false });
    const res = await llm.complete(req);
    expect(res.json).toEqual({ from: "live model" });
    expect(live.calls).toHaveLength(1);
  });

  it("with replay off and no live model connected, it says so instead of falling back to a recording", async () => {
    const llm = new ReplayLlm(new ScriptedLlm(), null, dir, { record: false, replay: false });
    await expect(llm.complete(req)).rejects.toThrow(/live model/i);
  });
});
