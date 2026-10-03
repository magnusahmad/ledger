// Harmless fictional upload evidence only: no external requests/data access.
import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { makeRuntimeCtx } from "../../src/lib/runtime";
import { ScriptedLlm } from "../../src/integrations/llm/scripted";
import { FakeMail } from "../../src/integrations/mail/fake";
import { createPerson } from "../../src/domain/records";
import { createRequest, startTask } from "../../src/domain/engine";
import { portalUpload } from "../../src/domain/portal";
import { document } from "../../src/db/schema";
if (!process.env.DATABASE_URL?.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e" || !process.env.STORAGE_DIR) throw new Error("Upload fixture requires isolated E2E/Fake environment");
const base = makeRuntimeCtx();
if (!(base.mail instanceof FakeMail)) throw new Error("Fake mail required");
const ctx = { ...base, llm: new ScriptedLlm().on("extract", { fields: [], documents: [], conflicts: [] }) };
const p = await createPerson(ctx, { nameEn: "WONG Fictional Upload", nameZh: "黃虛構上載" });
const r = await createRequest(ctx, { clientId: "cli_c1" });
const t = await startTask(ctx, { requestId: r.id, clientId: "cli_c1", playbookId: "hk.appointDirector", personId: p.id });
const samples = [
  { name: "fictional-scan.html", mime: "text/html", content: Buffer.from('<!doctype html><html><body><p id="audit-marker">Static fictional scan 繁體 简体</p><script>document.getElementById("audit-marker").textContent="UPLOAD_SCRIPT_EXECUTED";</script></body></html>') },
  { name: "fictional-scan.svg", mime: "image/svg+xml", content: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120"><text id="audit-marker" x="10" y="60">Static fictional scan</text><script>document.getElementById("audit-marker").textContent="UPLOAD_SCRIPT_EXECUTED";</script></svg>') },
  { name: "fictional-readable.pdf", mime: "application/pdf", content: readFileSync("eval/fixtures/fictional-readable.pdf") },
  { name: "fictional-readable.png", mime: "image/png", content: readFileSync("eval/fixtures/fictional-readable.png") },
];
const cases = [];
for (const s of samples) {
  await portalUpload(ctx, r.uploadToken, { taskId: t.id, key: "idCopy", filename: s.name, mime: s.mime, content: s.content });
  const rows = await ctx.db.select().from(document);
  const d = rows.find(row => row.taskId === t.id && row.title === s.name)!;
  cases.push({ documentId: d.id, filename: s.name, mime: s.mime, sha256: d.sha256 });
}
if (base.mail.sent().length) throw new Error("Unexpected mail transport");
writeFileSync(path.join(process.env.STORAGE_DIR!, "upload-safety-cases.json"), JSON.stringify(cases));
process.exit(0);
