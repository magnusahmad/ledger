// The already observed MODEL03 response, replayed offline for deadline UI acceptance.
import path from "node:path";
import { eq } from "drizzle-orm";
import { makeRuntimeCtx, STORAGE_ROOT } from "../../src/lib/runtime";
import { closePools } from "../../src/db/client";
import { ScriptedLlm } from "../../src/integrations/llm/scripted";
import { ingestMessage, processInbound } from "../../src/domain/inbound";
import { tasksForRequest } from "../../src/domain/engine";
import { getPlaybook } from "../../src/domain/playbooks";
import { kvSet } from "../../src/domain/kv";
import { task } from "../../src/db/schema";
import { goodDraft } from "../../tests/agent-fixtures";
import { INTAKE_CASES } from "../../eval/robust-model-cases";
import recorded from "../../eval/fixtures/2026-10-03-model-candidate-results.json";

const db = new URL(process.env.DATABASE_URL ?? "invalid:");
const relative = path.relative(process.cwd(), STORAGE_ROOT);
if (!["localhost", "127.0.0.1", "[::1]"].includes(db.hostname) || !db.pathname.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e" || process.env.SCREENING_PROVIDER !== "fake" || !relative || relative.startsWith("..") || path.isAbsolute(relative) || !path.basename(STORAGE_ROOT).includes("e2e")) throw new Error("Model deadline fixture requires local E2E database and fake providers/storage");
const runtime = makeRuntimeCtx({ bankProvider: "fake", accountingProvider: "fake" });
const llm = new ScriptedLlm();
const ctx = { ...runtime, llm };
try {
  llm.set("intake", recorded.results.find(r => r.id === "MODEL03")!.value);
  llm.set("draft", goodDraft);
  const source = INTAKE_CASES.find(c => c.id === "MODEL03")!;
  const message = await ingestMessage(ctx, { clientId: "cli_c1", channel: "email", provider: "fake", providerMessageId: "model03-browser", from: { email: "director@kbtrading.example", name: "CHAN Tai Man" }, to: ["desk@caineroad.example"], cc: [], subject: "Fictional board replacement", text: source.text, receivedAt: ctx.clock.now(), attachments: [] });
  const result = await processInbound(ctx, message.id);
  const resignation = (await tasksForRequest(ctx, result.requestId!)).find(t => t.playbookId === "hk.resignDirector")!;
  const pb = await getPlaybook(ctx, resignation.playbookId, resignation.playbookVersion);
  const lang = process.argv[2] as "en" | "tc" | "sc";
  if (!["en", "tc", "sc"].includes(lang)) throw new Error("Choose EN/TC/SC fictional title");
  const actorName = lang === "en" ? "CHAN Tai Man" : lang === "sc" ? "陈大文" : "陳大文";
  const title = `${pb.name[lang]}: ${actorName}`;
  // Display-only fixture title; source actor/date/checklist and response remain intact.
  await ctx.db.update(task).set({ title }).where(eq(task.id, resignation.id));
  const baseDate = new Date(`${ctx.clock.today()}T00:00:00Z`);
  const offset = Math.round((Date.parse("2026-12-01T00:00:00Z") - baseDate.getTime()) / 86400_000);
  await kvSet(ctx, "demo.clockOffsetDays", offset);
  console.log(JSON.stringify({ taskId: resignation.id, title, dueDate: resignation.dueDate, expectedDueDate: "2026-12-15", playbookVersion: pb.version, playbookNames: pb.name }));
} finally { await closePools(); }
