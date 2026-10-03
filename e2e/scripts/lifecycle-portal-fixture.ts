// Local-only fictional browser fixture. Commands advance real domain actions;
// they never load .env, contact providers or touch a database outside the E2E harness.
import path from "node:path";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { makeRuntimeCtx, STORAGE_ROOT } from "../../src/lib/runtime";
import { closePools } from "../../src/db/client";
import { createPerson } from "../../src/domain/records";
import { startManualRequest } from "../../src/domain/manual";
import { getRequest, getTask } from "../../src/domain/engine";
import { approveProposal } from "../../src/domain/proposals";
import { applyReview } from "../../src/agent/review";
import { document, person, proposal } from "../../src/db/schema";
import { Crypto } from "../../src/lib/crypto";
import { review } from "../../tests/agent-fixtures";
import "../../src/domain/inbound";

const db = new URL(process.env.DATABASE_URL ?? "invalid:");
const relative = path.relative(process.cwd(), STORAGE_ROOT);
if (!["localhost", "127.0.0.1", "[::1]"].includes(db.hostname) || !db.pathname.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e" || process.env.SCREENING_PROVIDER !== "fake" || !relative || relative.startsWith("..") || path.isAbsolute(relative) || !path.basename(STORAGE_ROOT).includes("e2e")) throw new Error("Lifecycle fixture requires the configured local E2E database and fake providers/storage");
const ctx = makeRuntimeCtx({ bankProvider: "fake", accountingProvider: "fake" });
const fixturePath = path.join(STORAGE_ROOT, "lifecycle-portal.json");
type Fixture = { token: string; taskId: string; siblingId: string; originalId: string; replacementId: string };

const mode = process.argv[2];
try {
  if (mode === "seed") {
    const base = { idNumber: "K987654(3)", residentialAddress: "Fictional browser home", correspondenceAddress: "Fictional browser office", phone: "+852 9000 0020" };
    const original = await createPerson(ctx, { ...base, nameEn: "Lifecycle Browser Original", nameZh: "測試原董事", email: "browser.original@audit.example" });
    const replacement = await createPerson(ctx, { ...base, nameEn: "Lifecycle Browser Replacement", nameZh: "測試新董事", email: "browser.replacement@audit.example" });
    const r = await startManualRequest(ctx, { clientId: "cli_c1", confirm: true, items: [
      { playbookId: "hk.appointDirector", person: { personId: original.id }, fields: { effDate: ctx.clock.today() } },
      { playbookId: "hk.changeOffice", fields: { effDate: ctx.clock.today(), newAddr: "Fictional browser sibling office" } },
    ] });
    await approveProposal(ctx, r.proposalId!);
    const req = await getRequest(ctx, r.requestId);
    const f: Fixture = { token: req.uploadToken, taskId: r.taskIds[0], siblingId: r.taskIds[1], originalId: original.id, replacementId: replacement.id };
    writeFileSync(fixturePath, JSON.stringify(f)); console.log(JSON.stringify(f));
  } else {
    const f = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
    if (mode === "switch") {
      const replacement = await ctx.db.query.person.findFirst({ where: eq(person.id, f.replacementId) });
      await applyReview(ctx, f.taskId, review({ items: [], switchPerson: { personId: f.replacementId, nameEn: replacement!.nameEn, nameZh: replacement!.nameZh }, summary: "Staff changed the appointee while the original portal page was open" }), { clientId: "cli_c1", actor: ctx.userId });
      console.log(JSON.stringify({ personId: (await getTask(ctx, f.taskId)).personId }));
    } else if (mode === "snapshot") {
      function files(dir: string, prefix = ""): [string, string][] {
        const out: [string, string][] = [];
        for (const e of readdirSync(dir, { withFileTypes: true }).filter(e => e.name !== "shots")) {
          if (e.isDirectory()) out.push(...files(path.join(dir, e.name), `${prefix}${e.name}/`));
          else out.push([`${prefix}${e.name}`, Crypto.sha256(readFileSync(path.join(dir, e.name)))]);
        }
        return out.sort((a, b) => a[0].localeCompare(b[0]));
      }
      const t = await getTask(ctx, f.taskId);
      console.log(JSON.stringify({ task: t, person: await ctx.db.query.person.findFirst({ where: eq(person.id, f.replacementId) }), docs: await ctx.db.select().from(document).where(eq(document.taskId, f.taskId)), cards: await ctx.db.select().from(proposal).where(eq(proposal.taskId, f.taskId)), sibling: await getTask(ctx, f.siblingId), bytes: files(STORAGE_ROOT) }));
    } else throw new Error("Expected seed, switch or snapshot");
  }
} finally { await closePools(); }
