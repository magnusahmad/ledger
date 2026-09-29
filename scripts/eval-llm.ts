// Live evaluation of the intake agent on realistic scenarios. Not part of `npm test`.
import { Client } from "pg";
import { runMigrations } from "@/db/migrate";
import { closePools } from "@/db/client";
import { makeRuntimeCtx } from "@/lib/runtime";
import { seedDemo } from "@/db/seed-demo";
import { ingestMessage, processInbound } from "@/domain/inbound";
import { tasksForRequest } from "@/domain/engine";
import { MemoryStorage } from "@/integrations/storage";
import { SCENARIOS, type Scenario } from "../eval/scenarios";

const URL = "postgres://localhost/harbourline_eval";
const only = process.argv[2];

async function fresh() {
  const c = new Client({ connectionString: URL });
  await c.connect();
  await c.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await c.end();
  await runMigrations(URL);
}

async function run(s: Scenario) {
  await fresh();
  const ctx = { ...makeRuntimeCtx({ DATABASE_URL: URL, llmMode: "live" }), storage: new MemoryStorage() };
  await seedDemo(ctx, { demoEmail: "director@kbtrading.example" });
  let n = 0;
  const send = async (text: string, subject: string, atts: string[] = []) => {
    const m = await ingestMessage(ctx, { channel: "email", provider: "eval", providerMessageId: `eval-${Date.now()}-${n++}`, from: { email: s.from, name: s.fromName }, to: ["desk@caineroad.example"], cc: [], subject, text, receivedAt: new Date(), attachments: atts.map((f) => ({ filename: f, mime: f.endsWith(".pdf") ? "application/pdf" : "image/jpeg", content: Buffer.from("x") })) });
    return processInbound(ctx, m.id);
  };
  for (const b of s.before ?? []) await send(b.text, b.subject ?? s.subject);
  const t0 = Date.now();
  const r = await send(s.text, s.subject, s.attachments);
  const ms = Date.now() - t0;
  const msg = await ctx.db.query.message.findFirst({ where: (m, { eq }) => eq(m.id, r.messageId) });
  const intake = msg!.intake as { language: string; client: { kind: string }; actions: { type: string; playbookId: string | null }[] } | null;
  const fails: string[] = [];
  if (!intake) fails.push("no intake");
  else {
    const e = s.expect;
    if (e.language && intake.language !== e.language) fails.push(`language ${intake.language} != ${e.language}`);
    if (e.clientKind && intake.client.kind !== e.clientKind) fails.push(`client ${intake.client.kind} != ${e.clientKind}`);
    const types = intake.actions.map((a) => a.type);
    for (const t of e.actionTypes ?? []) if (!types.includes(t)) fails.push(`missing action ${t} (got ${types.join(",")})`);
    for (const t of e.notActionTypes ?? []) if (types.includes(t)) fails.push(`unexpected action ${t}`);
    if (e.startPlaybooks) {
      const got = intake.actions.filter((a) => a.type === "start_request").map((a) => a.playbookId).filter((x) => x !== "hk.transferIn").sort();
      if (JSON.stringify(got) !== JSON.stringify([...e.startPlaybooks].sort())) fails.push(`playbooks ${got.join(",")} != ${e.startPlaybooks.join(",")}`);
    }
    if (r.requestId && (e.fields || e.personName)) {
      const tasks = await tasksForRequest(ctx, r.requestId);
      for (const [k, re] of Object.entries(e.fields ?? {})) {
        const v = tasks.map((t) => t.checklist.find((x) => x.key === k)?.value).find(Boolean);
        if (!v || !re.test(v)) fails.push(`field ${k}=${v} !~ ${re}`);
      }
      if (e.personName) {
        const names = await Promise.all(tasks.filter((t) => t.personId).map(async (t) => (await ctx.db.query.person.findFirst({ where: (p, { eq }) => eq(p.id, t.personId!) }))!.nameEn));
        if (!names.some((nm) => e.personName!.test(nm))) fails.push(`person ${names.join(",")} !~ ${e.personName}`);
      }
    }
  }
  const calls = await ctx.db.query.llmCall.findMany({ where: (c, { eq }) => eq(c.messageId, r.messageId) });
  const timing = calls.map((c) => `${c.agent}:${c.latencyMs}ms${c.error ? "(err)" : ""}/${c.tokensIn ?? "?"}in/${c.tokensOut ?? "?"}out`).join(" ");
  const drafts = await ctx.db.query.message.findMany({ where: (m, { eq, and }) => and(eq(m.direction, "out"), eq(m.status, "draft")) });
  return { fails, ms, intake, timing, draft: drafts.at(-1)?.text ?? null, draftLang: drafts.at(-1)?.language };
}

const results: { name: string; ok: boolean; ms: number }[] = [];
for (const s of SCENARIOS.filter((x) => !only || x.name.toLowerCase().includes(only.toLowerCase()))) {
  try {
    const r = await run(s);
    const ok = r.fails.length === 0;
    results.push({ name: s.name, ok, ms: r.ms });
    console.log(`${ok ? "PASS" : "FAIL"} ${s.name} (${r.ms} ms) [${r.timing}]${ok ? "" : "\n   " + r.fails.join("\n   ")}`);
    if (process.env.EVAL_VERBOSE) console.log(JSON.stringify(r.intake, null, 1), "\n--- draft ---\n", r.draft);
  } catch (e) {
    results.push({ name: s.name, ok: false, ms: 0 });
    console.log(`ERROR ${s.name}: ${(e as Error).stack}`);
  }
}
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passed; median ${results.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(results.length / 2)]} ms`);
await closePools();
