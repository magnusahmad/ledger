// Original reporter: one bounded interleaving against the published Area4 repair.
// Company B has no prior registered reference, so its baseline cannot already
// mask a late cross-company live-profile change during approval.
import { beforeEach, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { appoint, createClient, createPerson, officersAsAt } from "@/domain/records";
import { advance, getTask, startTask } from "@/domain/engine";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import { appointment, person, significantController, task, taskEvent } from "@/db/schema";
import { registerPersonAsAt } from "@/domain/register-person";
import type { Ctx } from "@/lib/ctx";
import "@/domain/inbound";
let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx({ now: "2026-10-02T02:00:00Z" }); await seedDemo(ctx); });
async function preview(t: Awaited<ReturnType<typeof startTask>>) {
  const full = await getTask(ctx, t.id); const idx = full._steps.findIndex(s => s.kind === "register");
  await ctx.db.update(task).set({ checklist: full.checklist.map(e => ({ ...e, status: "received", value: e.value ?? "Staff confirmed imported fixture" })), stepIndex: idx - 1,
    stepState: Object.fromEntries(full._steps.slice(0, idx).map((_, i) => [String(i), { sent: true, cleared: true, generated: true, signed: true, filed: true, done: true }])) }).where(eq(task.id, t.id));
  await advance(ctx, t.id); const p = (await pendingProposals(ctx, { taskId: t.id, kind: "register_change" }))[0]; expect(p).toBeDefined(); return p;
}
it("A4R12 a new company's officer approval paused before shared-person locking cannot silently adopt another company's newly approved name", async () => {
  const shared = await createPerson(ctx, { nameEn: "Race Original Fictional Officer", correspondenceAddress: "Race original address" });
  await appoint(ctx, { clientId: "cli_c1", personId: shared.id, role: "director", fromDate: "2020-01-01" });
  const b = await createClient(ctx, { nameEn: "Race New Company B Limited", jurisdiction: "HK", incorporatedOn: "2020-01-01" });
  const change = await startTask(ctx, { clientId: "cli_c1", personId: shared.id, playbookId: "hk.changeParticulars", extracted: { effDate: { value: "2026-10-01" }, changeDetail: { value: "Explicit fictional company A new officer name" } } });
  ctx.llm.set("structure_particulars", { changes: [{ field: "nameEn", value: "Race Approved Company A Officer" }] });
  const changePreview = await preview(change);
  const add = await startTask(ctx, { clientId: b.id, personId: shared.id, playbookId: "hk.appointDirector", extracted: { effDate: { value: "2026-10-01" } } });
  const addPreview = await preview(add); expect(addPreview.payload.preview).toEqual([expect.stringContaining(shared.nameEn)]);
  const dialect = new PgDialect(); let entered!: () => void; let release!: () => void; let paused = false;
  const reached = new Promise<void>(r => { entered = r; }); const gate = new Promise<void>(r => { release = r; });
  const wrap = (db: Ctx["db"]): Ctx["db"] => new Proxy(db, { get(target, prop) {
    if (prop === "transaction") return (fn: (tx: Ctx["db"]) => Promise<unknown>, ...rest: unknown[]) => target.transaction(tx => fn(wrap(tx as unknown as Ctx["db"])), ...rest as []);
    if (prop === "execute") return async (query: Parameters<typeof db.execute>[0]) => {
      const q = dialect.sqlToQuery(query as Parameters<typeof dialect.sqlToQuery>[0]);
      if (!paused && /from\s+"?person"?\s+where/i.test(q.sql) && /for update/i.test(q.sql) && q.params.includes(shared.id)) { paused = true; entered(); await gate; }
      return target.execute(query);
    };
    const value = Reflect.get(target, prop); return typeof value === "function" ? value.bind(target) : value;
  } });
  const pending = approveProposal({ ...ctx, db: wrap(ctx.db) }, addPreview.id).then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([reached, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Fixture did not reach candidate shared-person row lock")), 5000); })]);
    if (timer) clearTimeout(timer);
    expect(await ctx.db.select().from(appointment).where(eq(appointment.clientId, b.id))).toHaveLength(0);
    await approveProposal(ctx, changePreview.id);
  } finally { if (timer) clearTimeout(timer); release(); }
  const result = await pending;
  expect((await officersAsAt(ctx, "cli_c1", "2026-10-01", "director")).find(o => o.personId === shared.id)!.person.nameEn).toBe("Race Approved Company A Officer");
  const officers = await officersAsAt(ctx, b.id, "2026-10-01", "director");
  if (result.ok) {
    expect(officers).toHaveLength(1); expect(officers[0].person.nameEn).toBe(shared.nameEn);
  } else {
    expect(String(result.error)).toMatch(/changed|stale|fresh|preview/i); expect(officers).toHaveLength(0);
    expect(await ctx.db.select().from(taskEvent).where(and(eq(taskEvent.taskId, add.id), eq(taskEvent.kind, "register.updated")))).toHaveLength(0);
  }
}, 120000);

for (const variant of [
  { id: "A4R14", playbook: "hk.changeSecretary", actor: "firm secretary", role: "secretary" },
  { id: "A4R15", playbook: "hk.updateControllers", actor: "typed controller", role: null },
]) it(`${variant.id} a new company's prospective ${variant.actor} approval cannot adopt a name approved elsewhere after its human preview`, async () => {
  const shared = variant.role
    ? (await ctx.db.query.person.findFirst({ where: eq(person.id, "per_firm") }))!
    : await createPerson(ctx, { nameEn: "Race Original Fictional Controller", correspondenceAddress: "Race original controller address" });
  if (!variant.role) await appoint(ctx, { clientId: "cli_c1", personId: shared.id, role: "director", fromDate: "2020-01-01" });
  const b = await createClient(ctx, { nameEn: `Race Prospective ${variant.actor} Company B Limited`, jurisdiction: "HK", incorporatedOn: "2020-01-01" });
  const change = await startTask(ctx, { clientId: "cli_c1", personId: shared.id, playbookId: "hk.changeParticulars", extracted: { effDate: { value: "2026-10-01" }, changeDetail: { value: "Explicit fictional company A new actor name" } } });
  ctx.llm.set("structure_particulars", { changes: [{ field: "nameEn", value: "Race Approved Company A Actor" }] });
  const changePreview = await preview(change);
  if (!variant.role) ctx.llm.set("structure_controllers", { items: [{ kind: "add", personId: shared.id, nature: "Confirmed majority-board appointment rights", registrableFrom: "2026-10-01" }] });
  const add = await startTask(ctx, { clientId: b.id, playbookId: variant.playbook, extracted: { effDate: { value: "2026-10-01" } } });
  expect(add.personId).toBeNull();
  const addPreview = await preview(add); expect(JSON.stringify(addPreview.payload.preview)).toContain(shared.nameEn);
  const dialect = new PgDialect(); let entered!: () => void; let release!: () => void; let paused = false;
  const reached = new Promise<void>(r => { entered = r; }); const gate = new Promise<void>(r => { release = r; });
  const wrap = (db: Ctx["db"]): Ctx["db"] => new Proxy(db, { get(target, prop) {
    if (prop === "transaction") return (fn: (tx: Ctx["db"]) => Promise<unknown>, ...rest: unknown[]) => target.transaction(tx => fn(wrap(tx as unknown as Ctx["db"])), ...rest as []);
    if (prop === "execute") return async (query: Parameters<typeof db.execute>[0]) => {
      const q = dialect.sqlToQuery(query as Parameters<typeof dialect.sqlToQuery>[0]);
      if (!paused && /from\s+"?person"?\s+where/i.test(q.sql) && /for update/i.test(q.sql) && q.params.includes(shared.id)) { paused = true; entered(); await gate; }
      return target.execute(query);
    };
    const value = Reflect.get(target, prop); return typeof value === "function" ? value.bind(target) : value;
  } });
  const pending = approveProposal({ ...ctx, db: wrap(ctx.db) }, addPreview.id).then(value => ({ ok: true as const, value }), error => ({ ok: false as const, error }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([reached, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Fixture did not reach candidate prospective actor lock")), 5000); })]);
    if (timer) clearTimeout(timer);
    await approveProposal(ctx, changePreview.id);
  } finally { if (timer) clearTimeout(timer); release(); }
  const result = await pending;
  expect((await registerPersonAsAt(ctx, "cli_c1", shared.id, "2026-10-01")).nameEn).toBe("Race Approved Company A Actor");
  const records = variant.role
    ? await ctx.db.select().from(appointment).where(and(eq(appointment.clientId, b.id), eq(appointment.personId, shared.id), eq(appointment.role, "secretary")))
    : await ctx.db.select().from(significantController).where(and(eq(significantController.clientId, b.id), eq(significantController.personId, shared.id)));
  if (result.ok) {
    expect(records).toHaveLength(1);
    expect((await registerPersonAsAt(ctx, b.id, shared.id, "2026-10-01")).nameEn).toBe(shared.nameEn);
  } else {
    expect(String(result.error)).toMatch(/changed|stale|fresh|preview/i); expect(records).toHaveLength(0);
    expect(await ctx.db.select().from(taskEvent).where(and(eq(taskEvent.taskId, add.id), eq(taskEvent.kind, "register.updated")))).toHaveLength(0);
  }
}, 120000);
