// Fictional E2E fixtures use public task progression and actual human register approval.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { makeRuntimeCtx } from "../../src/lib/runtime";
import { closePools } from "../../src/db/client";
import { FixedClock } from "../../src/lib/clock";
import { createClient } from "../../src/domain/records";
import { getPlaybook, savePlaybookVersion } from "../../src/domain/playbooks";
import { createRequest, startTask } from "../../src/domain/engine";
import { completeSending } from "../../src/domain/sending";
import { completeManualStep } from "../../src/domain/step-hooks";
import { approveProposal, pendingProposals } from "../../src/domain/proposals";
import type { Movements } from "../../src/agent/structure";

if (!process.env.DATABASE_URL?.endsWith("_e2e") || process.env.MAIL_PROVIDER !== "fake" || process.env.LLM_MODE !== "e2e") throw new Error("Share fixtures require isolated E2E DB and fake providers");
const ctx = { ...makeRuntimeCtx(), clock: new FixedClock(new Date("2026-10-02T02:00:00Z")) };
for (const [id, detail] of [["hk.allotShares", "allotmentDetails"], ["hk.transferShares", "transferDetails"]]) {
  const pb = await getPlaybook(ctx, id);
  await savePlaybookVersion(ctx, id, pb.version, JSON.stringify({ ...pb, feeCents: 0, statutoryFees: [], documents: [], forms: "", deadline: { kind: "none" },
    requirements: [{ key: detail }, { key: "effDate" }], registerEffects: pb.registerEffects.filter(e => e.kind !== "update_controllers"),
    steps: [{ kind: "send", label: "Staff deliver verified instruction", human: true }, { kind: "collect", label: "Collect verified instruction" },
      { kind: "task", label: "Verify supporting documents", human: true }, { kind: "register", label: "Approve share ledger", human: true },
      { kind: "confirm", label: "Approve confirmation", human: true }] }));
}
async function ready(clientId: string, movement: Movements["items"][number], date: string) {
  const req = await createRequest(ctx, { clientId });
  const detail = movement.kind === "allotment" ? "allotmentDetails" : "transferDetails";
  const t = await startTask(ctx, { clientId, requestId: req.id, playbookId: movement.kind === "allotment" ? "hk.allotShares" : "hk.transferShares",
    extracted: { [detail]: { value: `${movement.kind === "allotment" ? "Allot" : "Transfer"} ${movement.quantity} ${movement.className} shares, confirmed USD consideration.` }, effDate: { value: date } }, params: { structured: { items: [movement] } } });
  await completeSending(ctx, [t.id], req.id, "Staff checked external delivery");
  await completeManualStep(ctx, t.id, "Staff verified fictional supporting records");
  const p = (await pendingProposals(ctx, { taskId: t.id, kind: "register_change" }))[0];
  if (!p) throw new Error("Expected human register approval");
  return p;
}
const names = { en: "USD preference", tc: "美元優先股份", sc: "美元优先股份" };
const cases = [];
for (const language of ["en", "tc", "sc"] as const) {
  const c = await createClient(ctx, { nameEn: `Fictional share audit ${language.toUpperCase()} Limited`,
    nameTc: language === "tc" ? "虛構歷史股份審核有限公司" : language === "sc" ? "虚构历史股份审核有限公司" : null,
    nameSc: language === "sc" ? "虚构历史股份审核有限公司" : null,
    incorporatedOn: "2020-01-01", messageLang: language, docLang: language });
  const allotment: Movements["items"][number] = { kind: "allotment", fromPersonId: null, fromName: null, toPersonId: "per_p1", toName: "CHAN Tai Man", toNameZh: null,
    className: names[language], currency: "USD", quantity: 10, pricePerShareCents: 100, considerationCents: 1000,
    considerationType: "cash", unpaidCents: 0, existingUnpaidCents: 0, allotteeAddress: "Fictional audit address", allotteeKind: "individual" };
  await approveProposal(ctx, (await ready(c.id, allotment, "2026-09-01")).id);
  const transfer = { ...allotment, kind: "transfer" as const, fromPersonId: "per_p1", fromName: "CHAN Tai Man", toPersonId: "per_p2", toName: "LEE Siu Ling", quantity: 4, considerationCents: 400 };
  await approveProposal(ctx, (await ready(c.id, transfer, "2026-09-02")).id);
  const proposal = await ready(c.id, { ...allotment, quantity: 15, considerationCents: 1500 }, "2026-10-01");
  cases.push({ language, clientId: c.id, className: names[language], proposalId: proposal.id });
}
writeFileSync(path.join(process.env.STORAGE_DIR!, "historical-share-cases.json"), JSON.stringify(cases));
await closePools();
