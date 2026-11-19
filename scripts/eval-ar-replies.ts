// Runs the frozen reply test set (eval/ar-reply-cases.ts) through the same prompt and schema the
// reply reader uses in production, against the live product model, and scores each reading against
// the expectation agreed beforehand. Fictional data only; needs or_api_key in .env. Run after every
// prompt or model change. Results go to eval/results/ar-replies-<prompt version>-<model>/.
//   npx tsx scripts/eval-ar-replies.ts [--model <openrouter id>] [--only <case id>]
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "dotenv";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { OpenRouterLlm } from "../src/integrations/llm/openrouter";
import { jsonSchemaOf } from "../src/agent/call";
import { buildReplyPrompt, type ReplyInput } from "../src/annual/reply-reader";
import { PROMPT_VERSION, REPLY_TASK, ReplyReadingZ, type ReplyReading } from "../src/annual/reply-types";
import { AR_REPLY_CASES, CASE_COMPANY, DISPATCH, type ReplyCase } from "../eval/ar-reply-cases";
import { scoreReply, summarise, type Score } from "../eval/ar-reply-score";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : undefined; };

async function pdfOf(lines: string[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  lines.forEach((l, i) => page.drawText(l, { x: 56, y: 770 - i * 26, size: 13, font }));
  return Buffer.from(await doc.save());
}

async function inputFor(c: ReplyCase): Promise<ReplyInput> {
  const attachments: ReplyInput["attachments"] = [];
  for (const a of c.attachments ?? []) {
    if (a.kind === "pdf") { const content = await pdfOf(a.lines); attachments.push({ filename: a.filename, mime: "application/pdf", bytes: content.length, content }); }
    else attachments.push({ filename: a.filename, mime: a.mime, bytes: 1024 });
  }
  return {
    today: CASE_COMPANY.today, caseKind: "AR", companyName: CASE_COMPANY.companyName, year: CASE_COMPANY.year, madeUpDate: CASE_COMPANY.madeUpDate,
    particulars: CASE_COMPANY.particulars,
    earlier: [{ direction: "out" as const, text: DISPATCH }, ...(c.earlier ?? [])].map((e, i) => ({ ...e, at: `2026-11-2${1 + i}T02:00:00.000Z`, from: e.direction === "out" ? "ruby@firm.example" : c.from, subject: "Alpha Trading Limited - 2026 Annual Return" })),
    message: { from: c.from, fromName: c.fromName, subject: c.subject ?? "RE: Alpha Trading Limited - 2026 Annual Return", receivedAt: "2026-11-25T03:00:00.000Z", text: c.text },
    attachments,
  };
}

async function main() {
  const env = parse(await readFile(".env", "utf8"));
  const key = env.or_api_key ?? process.env.or_api_key;
  if (!key) throw new Error("or_api_key is not set in .env");
  const model = arg("model") ?? env.LLM_MODEL ?? "google/gemini-3.8-flash";
  const effort = (env.LLM_REASONING ?? "low") as "none" | "low" | "medium" | "high";
  const llm = new OpenRouterLlm(key, model, "http://localhost:3000", effort);
  const schema = jsonSchemaOf(ReplyReadingZ);
  const cases = arg("only") ? AR_REPLY_CASES.filter((c) => c.id === arg("only")) : AR_REPLY_CASES;
  const out: { id: string; lang: string; note: string; ms: number; score: Score | null; reading: ReplyReading | null; error?: string; model?: string }[] = [];

  async function run(c: ReplyCase) {
    const prompt = buildReplyPrompt(await inputFor(c));
    const started = Date.now();
    let error: string | undefined, reading: ReplyReading | null = null, answeredBy: string | undefined;
    for (let attempt = 0; attempt < 2 && !reading; attempt++) { // production retries once too (src/agent/call.ts)
      try {
        const res = await llm.complete({ agent: REPLY_TASK, messages: [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }], schema, schemaName: REPLY_TASK });
        answeredBy = res.model;
        const p = ReplyReadingZ.safeParse(res.json);
        if (p.success) reading = p.data; else error = p.error.message.slice(0, 300);
      } catch (e) { error = (e as Error).message.replaceAll(key, "[redacted]").slice(0, 300); }
    }
    const score = reading ? scoreReply(c.expect, reading) : null;
    out.push({ id: c.id, lang: c.lang, note: c.note, ms: Date.now() - started, score, reading, error: reading ? undefined : error, model: answeredBy });
    console.log(`${score?.pass ? "pass" : reading ? "FAIL" : "ERR "}  ${c.id}${score && !score.pass ? `  ${score.problems.map((p) => `${p.kind}: ${p.what}`).join("; ")}` : ""}${reading ? "" : `  ${error}`}`);
  }
  const queue = [...cases];
  await Promise.all(Array.from({ length: 4 }, async () => { for (let c = queue.shift(); c; c = queue.shift()) await run(c); }));

  out.sort((a, b) => cases.findIndex((c) => c.id === a.id) - cases.findIndex((c) => c.id === b.id));
  const sum = summarise(out);
  const ms = out.map((o) => o.ms).sort((a, b) => a - b);
  const dir = path.join("eval", "results", `ar-replies-${PROMPT_VERSION}-${model.replace(/[^\w.-]+/g, "_")}`);
  await mkdir(dir, { recursive: true });
  const meta = { ranAt: new Date().toISOString(), model, reasoning: effort, promptVersion: PROMPT_VERSION, ...sum, medianMs: ms[Math.floor(ms.length / 2)], maxMs: ms[ms.length - 1] };
  await writeFile(path.join(dir, "results.json"), JSON.stringify({ meta, results: out }, null, 2));
  const row = (o: (typeof out)[number]) => `| ${o.id} | ${o.lang} | ${o.score?.pass ? "pass" : o.score ? "fail" : "no reading"} | ${o.score?.problems.map((p) => `${p.kind}: ${p.what}`).join("; ") || (o.error ?? "")} |`;
  await writeFile(path.join(dir, "report.md"), [
    `# Reply reader: frozen set, ${PROMPT_VERSION}, ${model}`, "",
    `Run ${meta.ranAt}. Reasoning effort ${effort}. Fictional replies only (eval/ar-reply-cases.ts); expectations were fixed before the run.`, "",
    `- Cases: ${sum.cases}; fully correct: ${sum.passed}; no usable reading: ${sum.failedToRead}`,
    `- Missed (in the reply, not reported): ${sum.missed}`, `- Extra (reported, not in the reply): ${sum.extra}`, `- Wrong value: ${sum.wrong}`,
    `- Time per reply: median ${(meta.medianMs / 1000).toFixed(1)} s, slowest ${(meta.maxMs / 1000).toFixed(1)} s`, "",
    "| Case | Language | Result | Problems |", "|---|---|---|---|", ...out.map(row), "",
  ].join("\n"));
  console.log(`\n${sum.passed}/${sum.cases} fully correct; missed ${sum.missed}, extra ${sum.extra}, wrong ${sum.wrong}, no reading ${sum.failedToRead}. Saved to ${dir}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
