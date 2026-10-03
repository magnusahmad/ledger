// Same Area9 SEQ08–10 business sequence; fake configured E2E DB only.
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { makeRuntimeCtx, STORAGE_ROOT } from "../../src/lib/runtime";
import { closePools } from "../../src/db/client";
import { createRequest, startTask, getTask } from "../../src/domain/engine";
import { getPlaybook, savePlaybookVersion } from "../../src/domain/playbooks";
import { tickItem } from "../../src/domain/step-hooks";
import { pendingProposals } from "../../src/domain/proposals";
import { client, document, filing, taskAction } from "../../src/db/schema";
import "../../src/domain/inbound";

const db = new URL(process.env.DATABASE_URL ?? "invalid:");
const relative = path.relative(process.cwd(), STORAGE_ROOT);
if (!["localhost", "127.0.0.1", "[::1]"].includes(db.hostname) || !db.pathname.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e" || process.env.SCREENING_PROVIDER !== "fake" || !relative || relative.startsWith("..") || path.isAbsolute(relative) || !path.basename(STORAGE_ROOT).includes("e2e")) throw new Error("Workflow fixture requires configured local E2E database and fake providers/storage");
const ctx = makeRuntimeCtx({ bankProvider: "fake", accountingProvider: "fake" });
const file = path.join(STORAGE_ROOT, "edited-workflow.json");
try {
  if (process.argv[2] === "seed") {
    const lang = process.argv[3] as "en" | "tc" | "sc";
    if (!["en", "tc", "sc"].includes(lang)) throw new Error("Expected fictional display language");
    const titles = { en: "Fictional reviewed office workflow", tc: "虛構已審閱地址工作流程", sc: "虚构已审阅地址工作流程" };
    const proofTitles = { en: "Verify original authority before filing", tc: "提交前核對原本授權證明", sc: "提交前核对原本授权证明" };
    const holds = { en: "Wait for staff review of the authority receipt", tc: "等候職員核對正式收據", sc: "等候职员核对正式收据" };
    const pb = structuredClone(await getPlaybook(ctx, "hk.changeOffice"));
    pb.documents = []; pb.requirements = [{ key: "newAddr" }, { key: "effDate" }];
    pb.steps = [{ kind: "collect", label: "Confirm particulars" }, { kind: "file", label: "Record manually prepared NR1", human: true, authority: "Fictional Registry" }, { kind: "register", label: "Approve office update", human: true }, { kind: "task", label: "Archive original receipt", human: true }];
    await savePlaybookVersion(ctx, pb.id, pb.version, JSON.stringify(pb));
    const req = await createRequest(ctx, { clientId: "cli_c1", summary: "Fictional manual form; explicit human recording" });
    const address = lang === "en" ? "Unit 7, Fictional Road, Hong Kong" : lang === "tc" ? "香港虛構道七號測試辦公室" : "香港虚构道七号测试办公室";
    const t = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: pb.id, title: titles[lang], extracted: { newAddr: { value: address } } });
    const cl = await ctx.db.query.client.findFirst({ where: eq(client.id, "cli_c1") });
    const fixture = { taskId: t.id, title: titles[lang], proofTitle: proofTitles[lang], hold: holds[lang], address, originalAddress: cl!.regOfficeEn };
    writeFileSync(file, JSON.stringify(fixture)); console.log(JSON.stringify(fixture));
  } else {
    const f = JSON.parse(readFileSync(file, "utf8")) as { taskId: string };
    if (process.argv[2] === "facts") await tickItem(ctx, f.taskId, "effDate", ctx.clock.today());
    else if (process.argv[2] !== "snapshot") throw new Error("Expected seed/facts/snapshot");
    const t = await getTask(ctx, f.taskId);
    console.log(JSON.stringify({ task: { id: t.id, status: t.status, stepIndex: t.stepIndex, stepState: t.stepState, holdReason: t.holdReason },
      filings: await ctx.db.select().from(filing).where(eq(filing.sourceTaskId, t.id)),
      docs: await ctx.db.select().from(document).where(eq(document.taskId, t.id)),
      actions: await ctx.db.select().from(taskAction).where(eq(taskAction.taskId, t.id)),
      cards: (await pendingProposals(ctx, { taskId: t.id })).map(p => ({ id: p.id, kind: p.kind, status: p.status })),
      address: (await ctx.db.query.client.findFirst({ where: and(eq(client.id, t.clientId), eq(client.firmId, ctx.firmId)) }))!.regOfficeEn }));
  }
} finally { await closePools(); }
