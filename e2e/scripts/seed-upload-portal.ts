import { writeFileSync } from "node:fs";
import path from "node:path";
import { makeRuntimeCtx } from "../../src/lib/runtime";
import { FakeMail } from "../../src/integrations/mail/fake";
import { createPerson } from "../../src/domain/records";
import { createRequest, startTask } from "../../src/domain/engine";
if (!process.env.DATABASE_URL?.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e" || !process.env.STORAGE_DIR) throw new Error("Upload portal fixture requires isolated E2E/Fake environment");
const ctx = makeRuntimeCtx();
if (!(ctx.mail instanceof FakeMail)) throw new Error("FakeMail required");
const cases = [];
for (const width of [375, 768, 1280, 1440]) for (const language of ["en", "tc", "sc"]) {
  const nameEn = `Fictional signer for uploaded scan ${width} ${language}`;
  const nameZh = language === "sc" ? "虚构文件上传测试人员姓名，保持原有身份证资料等待人工处理" : "虛構文件上載測試人員姓名，保留原有身份證資料等待人手處理";
  const p = await createPerson(ctx, { nameEn, nameZh });
  const r = await createRequest(ctx, { clientId: "cli_c1" });
  const t = await startTask(ctx, { requestId: r.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id });
  cases.push({ width, language, personId: p.id, taskId: t.id, token: r.uploadToken });
}
if (ctx.mail.sent().length) throw new Error("Unexpected outbound");
writeFileSync(path.join(process.env.STORAGE_DIR!, "upload-portal-cases.json"), JSON.stringify(cases));
process.exit(0);
