import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { client, firm, shareClass } from "@/db/schema";
import { createClient } from "@/domain/records";
import { allot, buyback, createShareClass, issuedAsAt, membersAsAt, movementHistory, transfer } from "@/domain/shares";
import { createRequest, getTask, startTask } from "@/domain/engine";
import { getPlaybook, savePlaybookVersion } from "@/domain/playbooks";
import { completeManualStep } from "@/domain/step-hooks";
import { completeSending } from "@/domain/sending";
import { approveProposal, pendingProposals } from "@/domain/proposals";
import type { Movements } from "@/agent/structure";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx); });

async function company() {
  return createClient(ctx, { nameEn: "Fictional share-ledger audit Limited", incorporatedOn: "2020-01-01" });
}

// Deliberately valid, staff-published playbook variants isolate register approval.
// No raw task step/index writes; these tests do not claim to exercise CR filing.
async function approvalPlaybook(id: "hk.allotShares" | "hk.transferShares" | "hk.buyback", detail: string) {
  const pb = await getPlaybook(ctx, id);
  await savePlaybookVersion(ctx, id, pb.version, JSON.stringify({ ...pb,
    feeCents: 0, statutoryFees: [], documents: [], forms: "", deadline: { kind: "none" },
    requirements: [{ key: detail }, { key: "effDate" }],
    registerEffects: pb.registerEffects.filter(e => e.kind !== "update_controllers"),
    steps: [{ kind: "send", label: "Staff deliver verified instruction", human: true },
      { kind: "collect", label: "Collect verified instruction" },
      { kind: "task", label: "Staff verify supporting documents", human: true },
      { kind: "register", label: "Approve share ledger", human: true },
      { kind: "confirm", label: "Approve confirmation", human: true }],
  }));
}

function item(kind: "allotment" | "transfer", quantity: number, className = "Ordinary", currency = "HKD"): Movements["items"][number] {
  return { kind, fromPersonId: kind === "transfer" ? "per_p2" : null,
    fromName: kind === "transfer" ? "LEE Siu Ling" : null, toPersonId: "per_p1", toName: "CHAN Tai Man",
    toNameZh: null, className, quantity, pricePerShareCents: 100, considerationCents: quantity * 100,
    currency, considerationType: "cash", unpaidCents: 0, existingUnpaidCents: 0,
    allotteeAddress: "Fictional audit address", allotteeKind: "individual" };
}

async function readyApproval(clientId: string, movement: Movements["items"][number], date = "2026-09-29", allowBlocked = false) {
  const playbookId = movement.kind === "allotment" ? "hk.allotShares" : movement.kind === "transfer" ? "hk.transferShares" : "hk.buyback";
  const detail = movement.kind === "allotment" ? "allotmentDetails" : movement.kind === "transfer" ? "transferDetails" : "buybackDetails";
  const req = await createRequest(ctx, { clientId, summary: "Fictional share audit instruction" });
  const t = await startTask(ctx, { clientId, requestId: req.id, playbookId,
    extracted: { [detail]: { value: JSON.stringify(movement) }, effDate: { value: date } },
    params: { structured: { items: [movement] } } });
  await completeSending(ctx, [t.id], req.id, "Staff checked and delivered supporting instructions outside Clerk");
  expect((await getTask(ctx, t.id))._steps[(await getTask(ctx, t.id)).stepIndex].kind).toBe("task");
  await completeManualStep(ctx, t.id, "Verified fictional supporting instruction and class rights");
  const card = (await pendingProposals(ctx, { taskId: t.id, kind: "register_change" }))[0];
  if (!allowBlocked) expect(card, "the register changes must be separately presented for a human click").toBeDefined();
  return { t, card };
}

async function overlappingApprovals(ids: string[]) {
  const original = ctx.db.transaction.bind(ctx.db);
  let arrivals = 0, release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  ctx.db.transaction = (async (...args: Parameters<typeof original>) => {
    if (++arrivals <= ids.length) { if (arrivals === ids.length) release(); await gate; }
    return original(...args);
  }) as typeof ctx.db.transaction;
  try { return await Promise.allSettled(ids.map(id => approveProposal(ctx, id))); }
  finally { ctx.db.transaction = original; }
}

it("S-01 accepted dependent movements with tied timestamps remain readable when production-style IDs reverse lexical order", async () => {
  const c = await company();
  const cls = await createShareClass(ctx, { clientId: c.id, name: "Ordinary" });
  const base = ctx.ids, ids = ["shm_zzzzzzzzzzzz", "shm_aaaaaaaaaaaa"];
  ctx.ids = { next: prefix => prefix === "shm" ? ids.shift()! : base.next(prefix), token: () => base.token() };
  await allot(ctx, { clientId: c.id, shareClassId: cls.id, date: "2026-09-29", toPersonId: "per_p1", quantity: 10, amountPaidCents: 1000 });
  const accepted = await transfer(ctx, { clientId: c.id, shareClassId: cls.id, date: "2026-09-29", fromPersonId: "per_p1", toPersonId: "per_p2", quantity: 4 });
  expect(accepted.kind).toBe("transfer");
  expect(await membersAsAt(ctx, c.id, "2026-09-29")).toEqual([
    expect.objectContaining({ personId: "per_p1", quantity: 6 }), expect.objectContaining({ personId: "per_p2", quantity: 4 }),
  ]);
  expect(await issuedAsAt(ctx, c.id, "2026-09-29")).toEqual([expect.objectContaining({ issued: 10, paidUpCents: 1000 })]);
});

it("S-02 a human-approved USD allotment into a new class preserves its stated currency and capital", async () => {
  await approvalPlaybook("hk.allotShares", "allotmentDetails");
  const c = await company(), before = await movementHistory(ctx, c.id);
  const { card } = await readyApproval(c.id, item("allotment", 15, "USD preference", "USD"));
  expect(await movementHistory(ctx, c.id)).toEqual(before);
  expect(ctx.mail.sent()).toHaveLength(0);
  await approveProposal(ctx, card.id);
  expect(await issuedAsAt(ctx, c.id, "2026-09-29")).toEqual([
    expect.objectContaining({ name: "USD preference", currency: "USD", issued: 15, paidUpCents: 1500 }),
  ]);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("S-02 an HKD instruction against an existing USD class cannot be human-approved into that class", async () => {
  await approvalPlaybook("hk.allotShares", "allotmentDetails");
  const c = await company(), cls = await createShareClass(ctx, { clientId: c.id, name: "USD preference", currency: "USD" });
  await allot(ctx, { clientId: c.id, shareClassId: cls.id, date: "2020-01-01", toPersonId: "per_p1", quantity: 100, amountPaidCents: 10000 });
  const before = await movementHistory(ctx, c.id), classes = await ctx.db.select().from(shareClass);
  const { t, card } = await readyApproval(c.id, item("allotment", 15, cls.name, "HKD"), "2026-09-29", true);
  if (card) await expect(approveProposal(ctx, card.id)).rejects.toThrow(/currency|denomination|class|instruction/i);
  else {
    const triage = (await pendingProposals(ctx, { taskId: t.id, kind: "triage" }))[0];
    expect(triage?.summary).toMatch(/currency|denomination|class|instruction/i);
  }
  expect(await movementHistory(ctx, c.id)).toEqual(before);
  expect(await ctx.db.select().from(shareClass)).toEqual(classes);
  expect(await issuedAsAt(ctx, c.id, "2026-09-29")).toEqual([
    expect.objectContaining({ currency: "USD", issued: 100, paidUpCents: 10000 }),
  ]);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("S-02 a new share class with no confirmed currency blocks before any class or ledger mutation", async () => {
  await approvalPlaybook("hk.allotShares", "allotmentDetails");
  const c = await company(), classes = await ctx.db.select().from(shareClass), before = await movementHistory(ctx, c.id);
  const movement = item("allotment", 15, "Unconfirmed preference");
  delete movement.currency;
  const { t, card } = await readyApproval(c.id, movement, "2026-09-29", true);
  if (card) await expect(approveProposal(ctx, card.id)).rejects.toThrow(/currency|denomination|class|confirm/i);
  else {
    const triage = (await pendingProposals(ctx, { taskId: t.id, kind: "triage" }))[0];
    expect(triage?.summary).toMatch(/currency|denomination|class|confirm/i);
  }
  expect(await movementHistory(ctx, c.id)).toEqual(before);
  expect(await ctx.db.select().from(shareClass)).toEqual(classes);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("an existing confirmed USD class can retain its known denomination when a legacy instruction omits repeated currency", async () => {
  await approvalPlaybook("hk.allotShares", "allotmentDetails");
  const c = await company(), cls = await createShareClass(ctx, { clientId: c.id, name: "USD preference", currency: "USD" });
  await allot(ctx, { clientId: c.id, shareClassId: cls.id, date: "2020-01-01", toPersonId: "per_p1", quantity: 100, amountPaidCents: 10000 });
  const movement = item("allotment", 15, cls.name);
  delete movement.currency;
  const { card } = await readyApproval(c.id, movement);
  await approveProposal(ctx, card.id);
  expect(await issuedAsAt(ctx, c.id, "2026-09-29")).toEqual([
    expect.objectContaining({ currency: "USD", issued: 115, paidUpCents: 11500 }),
  ]);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("S-01 human approval of same-day dependent allotment and transfer remains readable with reversed movement IDs", async () => {
  await approvalPlaybook("hk.allotShares", "allotmentDetails");
  await approvalPlaybook("hk.transferShares", "transferDetails");
  const c = await company(), base = ctx.ids, ids = ["shm_yyyyyyyyyyyy", "shm_bbbbbbbbbbbb"];
  ctx.ids = { next: prefix => prefix === "shm" ? ids.shift()! : base.next(prefix), token: () => base.token() };
  const initial = await readyApproval(c.id, item("allotment", 10));
  await approveProposal(ctx, initial.card.id);
  const movement = { ...item("transfer", 4), fromPersonId: "per_p1", fromName: "CHAN Tai Man", toPersonId: "per_p2", toName: "LEE Siu Ling" };
  const change = await readyApproval(c.id, movement);
  expect(await movementHistory(ctx, c.id)).toHaveLength(1);
  await approveProposal(ctx, change.card.id);
  expect(await membersAsAt(ctx, c.id, "2026-09-29")).toEqual([
    expect.objectContaining({ personId: "per_p1", quantity: 6 }), expect.objectContaining({ personId: "per_p2", quantity: 4 }),
  ]);
  expect(await issuedAsAt(ctx, c.id, "2026-09-29")).toEqual([expect.objectContaining({ issued: 10, paidUpCents: 1000 })]);
  expect(ctx.mail.sent()).toHaveLength(0);
});

async function foreignCompany() {
  const f = (await ctx.db.select().from(firm))[0];
  await ctx.db.insert(firm).values({ ...f, id: "firm_shares_foreign", legalName: "Fictional separate firm" });
  const other = { ...ctx, firmId: "firm_shares_foreign" };
  const c = await createClient(other, { nameEn: "Confidential fictional foreign company", incorporatedOn: "2020-01-01" });
  const cls = await createShareClass(other, { clientId: c.id, name: "Confidential foreign preference", currency: "USD" });
  return { c, cls };
}

it("S-03 share-class creation rejects foreign and nonexistent company IDs without writing rows", async () => {
  const { c } = await foreignCompany(), before = await ctx.db.select().from(shareClass);
  for (const clientId of [c.id, "cli_missing_shares", "", "繁體简体\u0000"]) {
    await expect(createShareClass(ctx, { clientId, name: "Injected class" })).rejects.toThrow();
    expect(await ctx.db.select().from(shareClass)).toEqual(before);
  }
});

it("S-04 an as-at capital query never discloses another firm's class names or currencies", async () => {
  const { c } = await foreignCompany();
  expect(await issuedAsAt(ctx, c.id, "2026-09-29")).toEqual([]);
  expect(await membersAsAt(ctx, c.id, "2026-09-29")).toEqual([]);
  expect(await movementHistory(ctx, c.id)).toEqual([]);
});

it("overlapping independent human transfer approvals cannot jointly overdraw one member or apply a stale preview", async () => {
  await approvalPlaybook("hk.transferShares", "transferDetails");
  const a = await readyApproval("cli_c1", item("transfer", 2000));
  const b = await readyApproval("cli_c1", item("transfer", 2000));
  const before = await movementHistory(ctx, "cli_c1");
  // Both staff clicks claim their distinct previews before either execution starts.
  const results = await overlappingApprovals([a.card.id, b.card.id]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
  expect(await movementHistory(ctx, "cli_c1")).toHaveLength(before.length + 1);
  expect((await membersAsAt(ctx, "cli_c1", "2026-09-29")).find(m => m.personId === "per_p2")?.quantity).toBe(1000);
  expect((await issuedAsAt(ctx, "cli_c1", "2026-09-29"))[0]).toMatchObject({ issued: 10000, paidUpCents: 1000000 });
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("overlapping human allotment approvals apply only one reviewed snapshot without duplicating issued capital", async () => {
  await approvalPlaybook("hk.allotShares", "allotmentDetails");
  const a = await readyApproval("cli_c1", item("allotment", 25)), b = await readyApproval("cli_c1", item("allotment", 25));
  const before = await movementHistory(ctx, "cli_c1");
  const old = await issuedAsAt(ctx, "cli_c1", "2026-09-28");
  const results = await overlappingApprovals([a.card.id, b.card.id]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
  expect(await movementHistory(ctx, "cli_c1")).toHaveLength(before.length + 1);
  expect((await issuedAsAt(ctx, "cli_c1", "2026-09-29"))[0]).toMatchObject({ issued: 10025, paidUpCents: 1002500 });
  expect(await issuedAsAt(ctx, "cli_c1", "2026-09-28")).toEqual(old);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("overlapping human capital-funded buyback approvals preserve pre-buyback history and apply one verified reduction", async () => {
  await approvalPlaybook("hk.buyback", "buybackDetails");
  const buy: Movements["items"][number] = { ...item("transfer", 2000), kind: "buyback", toPersonId: null, toName: null,
    buybackFunding: "capital", capitalPaymentCents: 200000, postBuybackCapitalCents: 800000,
    paymentDate: "2026-09-29", existingUnpaidCents: 0 };
  const a = await readyApproval("cli_c1", buy), b = await readyApproval("cli_c1", buy);
  const before = await movementHistory(ctx, "cli_c1"), old = await issuedAsAt(ctx, "cli_c1", "2026-09-28");
  const results = await overlappingApprovals([a.card.id, b.card.id]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
  expect(await movementHistory(ctx, "cli_c1")).toHaveLength(before.length + 1);
  expect((await issuedAsAt(ctx, "cli_c1", "2026-09-29"))[0]).toMatchObject({ issued: 8000, paidUpCents: 800000 });
  expect((await membersAsAt(ctx, "cli_c1", "2026-09-29")).find(x => x.personId === "per_p2")?.quantity).toBe(1000);
  expect(await issuedAsAt(ctx, "cli_c1", "2026-09-28")).toEqual(old);
  expect(ctx.mail.sent()).toHaveLength(0);
});

it("a seeded mixed-class history reconciles holdings and capital at every date and rejects backdated overdraw atomically", async () => {
  const c = await company();
  const cls = await Promise.all([createShareClass(ctx, { clientId: c.id, name: "Ordinary", currency: "HKD" }),
    createShareClass(ctx, { clientId: c.id, name: "Preference", currency: "USD" })]);
  // LCG seed 0x4a4c2026; 16 accepted allotment/transfer/buyback sequences, 16 rejected backdates.
  let seed = 0x4a4c2026;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  const expected = new Map<string, { issued: number; paid: number; p1: number; p2: number }>();
  const snapshots: { date: string; capital: Awaited<ReturnType<typeof issuedAsAt>>; holdings: Awaited<ReturnType<typeof membersAsAt>> }[] = [];
  const seenClasses = new Set<string>();
  for (const cl of cls) {
    await allot(ctx, { clientId: c.id, shareClassId: cl.id, date: "2020-01-01", toPersonId: "per_p1", quantity: 100, amountPaidCents: 10000 });
    expected.set(cl.id, { issued: 100, paid: 10000, p1: 100, p2: 0 });
  }
  for (let i = 0; i < 16; i++) {
    const cl = cls[(next() >>> 16) % 2], q = 1 + next() % 8, day = `2026-09-${String(i + 1).padStart(2, "0")}`, ex = expected.get(cl.id)!;
    seenClasses.add(cl.id);
    ctx.clock.advanceSeconds(1);
    await allot(ctx, { clientId: c.id, shareClassId: cl.id, date: day, toPersonId: "per_p1", quantity: q, amountPaidCents: q * 100 });
    ex.issued += q; ex.p1 += q; ex.paid += q * 100;
    ctx.clock.advanceSeconds(1);
    await transfer(ctx, { clientId: c.id, shareClassId: cl.id, date: day, fromPersonId: "per_p1", toPersonId: "per_p2", quantity: q });
    ex.p1 -= q; ex.p2 += q;
    ctx.clock.advanceSeconds(1);
    await buyback(ctx, { clientId: c.id, shareClassId: cl.id, date: day, fromPersonId: "per_p2", quantity: q, capitalReductionCents: q * 100 });
    ex.issued -= q; ex.p2 -= q; ex.paid -= q * 100;
    const holdings = await membersAsAt(ctx, c.id, day), capital = await issuedAsAt(ctx, c.id, day);
    snapshots.push({ date: day, capital, holdings });
    for (const k of cls) {
      const e = expected.get(k.id)!;
      expect(capital.find(x => x.shareClassId === k.id)).toMatchObject({ currency: k.currency, issued: e.issued, paidUpCents: e.paid });
      expect(holdings.filter(x => x.shareClassId === k.id).reduce((n, x) => n + x.quantity, 0)).toBe(e.issued);
      expect(holdings.find(x => x.shareClassId === k.id && x.personId === "per_p1")?.quantity).toBe(e.p1);
    }
    const before = await movementHistory(ctx, c.id);
    await expect(transfer(ctx, { clientId: c.id, shareClassId: cl.id, date: "2019-12-31", fromPersonId: "per_p1", toPersonId: "per_p2", quantity: q })).rejects.toThrow(/exceeds/);
    expect(await movementHistory(ctx, c.id)).toEqual(before);
  }
  expect(seenClasses.size).toBe(2);
  for (const snapshot of snapshots) {
    expect(await issuedAsAt(ctx, c.id, snapshot.date)).toEqual(snapshot.capital);
    expect(await membersAsAt(ctx, c.id, snapshot.date)).toEqual(snapshot.holdings);
  }
  expect(await membersAsAt(ctx, c.id, "2019-12-31")).toEqual([]);
  expect(await issuedAsAt(ctx, "cli_c1", "2026-09-29")).toEqual([expect.objectContaining({ issued: 10000, paidUpCents: 1000000 })]);
});

it("wrong-company share classes and foreign member IDs cannot mutate an otherwise valid ledger", async () => {
  const c = await company(), cls = await createShareClass(ctx, { clientId: c.id, name: "Ordinary" });
  const before = await movementHistory(ctx, c.id);
  const foreign = await foreignCompany();
  const seeded = await ctx.db.query.shareClass.findFirst({ where: eq(shareClass.clientId, "cli_c1") });
  for (const classId of [seeded!.id, foreign.cls.id, "shc_missing"]) {
    await expect(allot(ctx, { clientId: c.id, shareClassId: classId, date: "2026-09-29", toPersonId: "per_p1", quantity: 1 })).rejects.toThrow();
  }
  await expect(allot(ctx, { clientId: c.id, shareClassId: cls.id, date: "2026-09-29", toPersonId: "per_missing", quantity: 1 })).rejects.toThrow();
  expect(await movementHistory(ctx, c.id)).toEqual(before);
  expect((await ctx.db.select().from(client).where(eq(client.id, c.id)))[0].firmId).toBe(ctx.firmId);
});
