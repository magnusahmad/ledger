// Exact fictional bytes and model output from the bounded live run; no live LLM.
import { beforeEach, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { extractFromDocument } from "@/agent/extract";
import { AgentError } from "@/agent/call";
import { createRequest, startTask } from "@/domain/engine";
import { document, person, task } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import recorded from "../eval/fixtures/2026-10-03-model-results.json";
import { checkExtract } from "../scripts/audit-model";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx({ now: "2026-10-03T02:00:00Z" }); await seedDemo(ctx); });
async function extractFixture(filename: string, mime: string, responseId: string) {
  const request = await createRequest(ctx, { clientId: "cli_c1", summary: "Fictional office instruction" });
  const t = await startTask(ctx, { requestId: request.id, clientId: "cli_c1", playbookId: "hk.changeOffice" });
  const bytes = await readFile(`eval/fixtures/${filename}`);
  expect(Crypto.sha256(bytes)).toBe((recorded.fixtureSha256 as Record<string, string>)[filename]);
  const id = ctx.ids.next("doc"), storageKey = `fictional-audit/${id}`;
  await ctx.storage.put(storageKey, bytes);
  await ctx.db.insert(document).values({ id, firmId: ctx.firmId, clientId: "cli_c1", taskId: t.id, kind: "upload", title: filename, storageKey, mime, sha256: Crypto.sha256(bytes), source: "upload", requirementKey: "premisesProof" });
  const row = recorded.results.find(r => r.id === responseId)!;
  ctx.llm.set("extract", row.value);
  const before = { docs: await ctx.db.select().from(document), people: await ctx.db.select().from(person), task: await ctx.db.query.task.findFirst({ where: eq(task.id, t.id) }) };
  let value: Awaited<ReturnType<typeof extractFromDocument>> | null = null;
  let refusal: unknown;
  try { value = await extractFromDocument(ctx, { taskId: t.id, forKey: "premisesProof", wantKeys: ["newAddr", "effDate", "newName"], filename, mime, content: bytes, onFile: { effDate: "2026-10-15" } }); }
  catch (error) { refusal = error; }
  expect({ docs: await ctx.db.select().from(document), people: await ctx.db.select().from(person), task: await ctx.db.query.task.findFirst({ where: eq(task.id, t.id) }) }).toEqual(before);
  expect(await ctx.storage.get(storageKey)).toEqual(bytes);
  return { value, refusal };
}
it("MODEL-R01 an unreadable tiny uploaded image cannot return fabricated office fields and preserves original upload and business records", async () => {
  const { value, refusal } = await extractFixture("fictional-poor.png", "image/png", "MODEL-DOC-poor");
  if (refusal) {
    expect(refusal).toBeInstanceOf(AgentError);
    expect((refusal as Error).message).toMatch(/clearer|readab|resolution|small|quality|uncertain/i);
    expect(ctx.llm.callsFor("extract")).toHaveLength(0);
  } else expect(value?.fields).toEqual([]);
});
it("a readable fictional PDF still extracts its actual address and date with an explicit on-file contradiction", async () => {
  const { value, refusal } = await extractFixture("fictional-readable.pdf", "application/pdf", "MODEL-DOC-readable");
  expect(refusal).toBeUndefined();
  expect(checkExtract(value!.fields, true)).toEqual([]);
  expect(value!.conflicts).toContainEqual({ key: "effDate", onFile: "2026-10-15", incoming: "2026-10-20" });
});
it("a readable image of the same fictional source remains extractable rather than disabling all image inputs", async () => {
  // Useful-resolution raster of the exact original PDF. The recorded correct
  // PDF reading is scripted for this paired image control; no new live request.
  const { value, refusal } = await extractFixture("fictional-readable.png", "image/png", "MODEL-DOC-readable");
  expect(refusal).toBeUndefined();
  expect(checkExtract(value!.fields, true)).toEqual([]);
  expect(ctx.llm.callsFor("extract")).toHaveLength(1);
});
