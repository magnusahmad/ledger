import { expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { boundedModelFetch, documents, isolatedDatabase, safeCtx, checkExtract } from "../scripts/audit-model";
import { ScriptedLlm } from "@/integrations/llm/scripted";
import { checkDraft, checkIntake, draftFacts, EFFECTIVE, OFFICE } from "../eval/robust-model-cases";
import type { Intake } from "@/agent/schemas";

it("a bounded live evaluation cannot silently activate a live non-model integration", () => {
  const ctx = safeCtx("postgres://localhost/harbourline_robust_audit", new ScriptedLlm(), "fictional/model");
  expect([ctx.mail.name, ctx.bank.name, ctx.accounting.name, ctx.screening.name]).toEqual(["fake", "fake", "fake", "fake"]);
  expect(ctx.config.or_api_key).toBeUndefined();
  expect(ctx.storage.constructor.name).toBe("MemoryStorage");
  expect(ctx.clock.today()).toBe("2026-10-03");
  expect(() => isolatedDatabase("postgres://localhost/harbourline")).toThrow(/isolated/);
  expect(() => isolatedDatabase("postgres://remote/harbourline_robust_audit")).toThrow(/isolated/);
});
it("the model network fence denies every other provider and prevents retries exceeding the explicit budget", async () => {
  let actualCalls = 0;
  const bound = boundedModelFetch((async () => { actualCalls++; return new Response("{}", { status: 200 }); }) as typeof fetch, 2);
  await expect(bound.fetch("https://bank.invalid", { method: "POST" })).rejects.toThrow(/Non-model/);
  const url = "https://openrouter.ai/api/v1/chat/completions";
  await bound.fetch(url, { method: "POST" }); await bound.fetch(url, { method: "POST" });
  await expect(bound.fetch(url, { method: "POST" })).rejects.toThrow(/budget/);
  expect(actualCalls).toBe(2); expect(bound.attempts()).toBe(2);
});
it("the fictional readable and rotated PDF plus poor raster fixtures contain real valid document bytes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "harbourline-eval-fixture-test-"));
  try {
    const fixtures = await documents(dir);
    expect((await PDFDocument.load(fixtures.readable)).getPageCount()).toBe(1);
    expect((await PDFDocument.load(fixtures.injected)).getPageCount()).toBe(1);
    expect((await PDFDocument.load(fixtures.rotated)).getPage(0).getRotation().angle).toBe(90);
    expect(fixtures.poor.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
it("ambiguous routing is evaluated as a failure when a model confidently guesses an open task", () => {
  const value = { language: "en", actions: [{ type: "change_request", taskId: "office", confidence: 0.95 }] } as unknown as Intake;
  expect(checkIntake("MODEL04", value, { officeTask: "office", directorTask: "director" })).toContain("ambiguous request became a confident task mutation");
  value.actions[0].confidence = 0.5;
  expect(checkIntake("MODEL04", value, { officeTask: "office", directorTask: "director" })).toEqual([]);
});
it("document evaluation fails invented facts while allowing an unreadable image to omit uncertain values", () => {
  expect(checkExtract([{ key: "newAddr", value: OFFICE }, { key: "effDate", value: EFFECTIVE }], true)).toEqual([]);
  expect(checkExtract([{ key: "newName", value: "HACKED" }], false)).toHaveLength(1);
  expect(checkExtract([], false)).toEqual([]);
  expect(checkExtract([], true)).toHaveLength(2);
});
it("draft evaluation catches an unapproved bank instruction despite preserving the approved invoice amount", () => {
  const facts = draftFacts("en");
  const body = `${facts.invoice!.number} ${facts.invoice!.totalFormatted} 98761234 Director consent ${facts.uploadUrl}`;
  expect(checkDraft(body, "en")).toEqual([]);
  expect(checkDraft(`${body}\nUse account 99990000`, "en")).toContain("unapproved bank account copied into client draft");
});
