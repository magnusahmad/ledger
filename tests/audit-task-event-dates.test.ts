import { beforeEach, expect, it } from "vitest";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { getTask, setChecklist, startTask } from "@/domain/engine";
import { startManualRequest } from "@/domain/manual";
import { getPlaybook, savePlaybookVersion } from "@/domain/playbooks";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });

it("a manually agreed resignation derives its canonical date and pinned deadline from the last day in office", async () => {
  const r = await startManualRequest(ctx, { clientId: "cli_c1", confirm: false, items: [{ playbookId: "hk.resignDirector", person: { personId: "per_p1" }, fields: { lastDay: "2026-11-30" } }] });
  expect(await getTask(ctx, r.taskIds[0])).toMatchObject({ effectiveDate: "2026-11-30", dueDate: "2026-12-15" });
  expect(ctx.mail.sent()).toHaveLength(0);
});
it("receiving or correcting the last day recomputes the deadline from the task's pinned playbook version", async () => {
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.resignDirector", personId: "per_p1" });
  const pinned = await getPlaybook(ctx, t.playbookId, t.playbookVersion);
  await savePlaybookVersion(ctx, pinned.id, pinned.version, JSON.stringify({ ...pinned, deadline: { ...pinned.deadline, days: 99 } }));
  for (const [date, due] of [["2026-11-30", "2026-12-15"], ["2026-12-01", "2026-12-16"]]) {
    const current = await getTask(ctx, t.id);
    await setChecklist(ctx, t.id, current.checklist.map(e => e.key === "lastDay" ? { ...e, status: "received", value: date } : e), "Staff confirmed last day");
    expect(await getTask(ctx, t.id)).toMatchObject({ playbookVersion: pinned.version, effectiveDate: date, dueDate: due });
  }
});
it("a reviewed explicit playbook date-key mapping drives the event deadline instead of another supplied date", async () => {
  const old = await getPlaybook(ctx, "hk.changeOffice");
  const published = await savePlaybookVersion(ctx, old.id, old.version, JSON.stringify({ ...old, effectiveDateKey: "meetingDate", requirements: [...old.requirements, { key: "meetingDate" }] }));
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: published.id, extracted: { effDate: { value: "2026-10-01" }, meetingDate: { value: "2026-11-30" } } });
  expect(t).toMatchObject({ playbookVersion: published.version, effectiveDate: "2026-11-30", dueDate: "2026-12-15" });
  await setChecklist(ctx, t.id, t.checklist.map(e => e.key === "meetingDate" ? { ...e, status: "received", value: "2026-12-01" } : e), "Staff corrected event date");
  expect(await getTask(ctx, t.id)).toMatchObject({ effectiveDate: "2026-12-01", dueDate: "2026-12-16" });
});
it("ordinary effective-date amendments retain the existing playbook deadline calculation", async () => {
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.changeOffice", extracted: { effDate: { value: "2026-11-01" } } });
  expect(t).toMatchObject({ effectiveDate: "2026-11-01", dueDate: "2026-11-16" });
  await setChecklist(ctx, t.id, t.checklist.map(e => e.key === "effDate" ? { ...e, status: "received", value: "2026-12-01" } : e), "Staff corrected date");
  expect(await getTask(ctx, t.id)).toMatchObject({ effectiveDate: "2026-12-01", dueDate: "2026-12-16" });
});
it("a manually supplied hard deadline remains authoritative when a last-day event date is supplied at creation", async () => {
  const r = await startManualRequest(ctx, { clientId: "cli_c1", confirm: false, items: [{ playbookId: "hk.resignDirector", person: { personId: "per_p1" }, fields: { lastDay: "2026-11-30" }, dueDate: "2026-12-20" }] });
  expect(await getTask(ctx, r.taskIds[0])).toMatchObject({ effectiveDate: "2026-11-30", dueDate: "2026-12-20" });
});
it("an unrelated playbook last-day field without an event-date mapping or cessation effect is not inferred as the event date", async () => {
  const old = await getPlaybook(ctx, "hk.kycReview");
  await savePlaybookVersion(ctx, old.id, old.version, JSON.stringify({ ...old, requirements: [...old.requirements, { key: "lastDay" }] }));
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: old.id, extracted: { lastDay: { value: "2026-11-30" } } });
  expect(t.effectiveDate).toBeNull();
});
it("a playbook cannot publish an event-date mapping to a missing or file requirement", async () => {
  const old = await getPlaybook(ctx, "hk.resignDirector");
  for (const effectiveDateKey of ["missingDate", "resignLetter"]) {
    await expect(savePlaybookVersion(ctx, old.id, old.version, JSON.stringify({ ...old, effectiveDateKey }))).rejects.toThrow(/effectiveDateKey/);
    expect((await getPlaybook(ctx, old.id)).version).toBe(old.version);
  }
});
it("a requirement review amends the canonical cessation date and its actual last-day field together", async () => {
  const { applyReview } = await import("@/agent/review");
  const { review } = await import("./agent-fixtures");
  const t = await startTask(ctx, { clientId: "cli_c1", playbookId: "hk.resignDirector", personId: "per_p1", extracted: { lastDay: { value: "2026-11-30" } } });
  await applyReview(ctx, t.id, review({ items: [], effectiveDate: "2026-12-01" }), { clientId: "cli_c1", kind: "change" });
  const changed = await getTask(ctx, t.id);
  expect(changed).toMatchObject({ effectiveDate: "2026-12-01", dueDate: "2026-12-16" });
  expect(changed.checklist.find(e => e.key === "lastDay")).toMatchObject({ status: "received", value: "2026-12-01" });
  expect(ctx.mail.sent()).toHaveLength(0);
});
it("an intake effective-date suggestion fills the declared cessation field when that field was omitted", async () => {
  const { ingestMessage, processInbound } = await import("@/domain/inbound");
  const { action, intake, goodDraft } = await import("./agent-fixtures");
  ctx.llm.set("intake", intake({ actions: [action({ type: "start_request", playbookId: "hk.resignDirector", effectiveDate: "2026-11-30", person: { mode: "existing", personId: "per_p1", nameEn: "CHAN Tai Man", nameZh: null, email: null } })] }));
  ctx.llm.set("draft", goodDraft);
  const m = await ingestMessage(ctx, { clientId: "cli_c1", channel: "email", provider: "fake", providerMessageId: "mapped-event-date", from: { email: "director@kbtrading.example", name: "CHAN" }, to: [ctx.mail.address], cc: [], subject: "Resignation date", text: "The director will resign on 30 November.", receivedAt: ctx.clock.now(), attachments: [] });
  const result = await processInbound(ctx, m.id);
  const t = await getTask(ctx, result.taskIds[0]);
  expect(t).toMatchObject({ effectiveDate: "2026-11-30", dueDate: "2026-12-15" });
  expect(t.checklist.find(e => e.key === "lastDay")).toMatchObject({ status: "received", value: "2026-11-30" });
  expect(ctx.mail.sent()).toHaveLength(0);
});
