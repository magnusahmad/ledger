// Some firms keep their own client list beside the records system: who is still a client, each
// company's year end and AGM month, and who to write to. Where an installation has one, the annual
// cycle reads it after the records (src/annual/client-list.ts). The list decides who is a client and
// wins on the year end; every place it differs from the records is listed for staff, so the records
// get corrected and a typing mistake in the list cannot move a deadline unseen.
import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { resetDb, makeCtx } from "./helpers";
import { client, contact, firm } from "@/db/schema";
import { applyClientList, readClientListReport, sameCompanyName, type ClientListEntry, type ClientListSource } from "@/annual/client-list";
import { syncCases, listCases } from "@/annual/cases";
import { runAnnualCycle, type CycleDeps } from "@/annual/cycle";
import type { RecordsSource } from "@/annual/records";

const entry = (o: Partial<ClientListEntry> & { code: string }): ClientListEntry => ({ nameEn: null, live: true, leftOutReason: null, incorporatedOn: null, yearEnd: null, agmMonth: null, noAgm: null, contactEmails: [], ...o });
const list = (entries: ClientListEntry[], version = "v1"): ClientListSource => ({ label: "the client workbook", read: async (since) => (since === version ? null : { version, entries, problems: [] }) });

async function seed(ctx: ReturnType<typeof makeCtx>) {
  await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "Test Firm", invoicePrefix: "T" });
  await ctx.db.insert(client).values([
    { id: "cl_a", firmId: ctx.firmId, code: "A001", nameEn: "Alpha Limited", incorporatedOn: "2015-11-20", fyeMonth: 12, fyeDay: 31, jurisdictionData: { fromRecords: { fyeMonth: 12, fyeDay: 31 } } },
    { id: "cl_b", firmId: ctx.firmId, code: "B002", nameEn: "Beta Limited", incorporatedOn: "2016-11-25", jurisdictionData: { fromRecords: { fyeMonth: null, fyeDay: null } } },
  ]);
}
const get = async (ctx: ReturnType<typeof makeCtx>, id: string) => (await ctx.db.query.client.findFirst({ where: eq(client.id, id) }))!;

describe("the firm's client list", () => {
  beforeEach(async () => { await resetDb(); });

  it("a company the list marks as no longer a client gets no cases, and is listed with the reason", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    const r = await applyClientList(ctx, list([entry({ code: "A001", live: false, leftOutReason: "struck" }), entry({ code: "B002" })]));
    await syncCases(ctx, { withinDays: 60 });
    expect((await listCases(ctx)).map((c) => c.clientCode)).toEqual(["B002"]);
    expect(r!.differences).toContainEqual(expect.objectContaining({ code: "A001", kind: "leftOut", list: "struck" }));
  });

  it("a case nobody has started is removed when the list says the company is no longer a client", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    await syncCases(ctx, { withinDays: 60 });
    await applyClientList(ctx, list([entry({ code: "A001", live: false, leftOutReason: "red" }), entry({ code: "B002" })]));
    await syncCases(ctx, { withinDays: 60 });
    expect((await listCases(ctx)).map((c) => c.clientCode)).toEqual(["B002"]);
  });

  it("a company that is a client again gets its cases back", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    await applyClientList(ctx, list([entry({ code: "A001", live: false, leftOutReason: "struck" })], "v1"));
    await applyClientList(ctx, list([entry({ code: "A001" })], "v2"));
    await syncCases(ctx, { withinDays: 60 });
    expect((await listCases(ctx)).map((c) => c.clientCode)).toContain("A001");
  });

  it("where the list and the records differ on the year end, the list's is used and the difference is listed with both", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    const r = await applyClientList(ctx, list([entry({ code: "A001", yearEnd: { month: 3, day: 31 } }), entry({ code: "B002" })]));
    expect(await get(ctx, "cl_a")).toMatchObject({ fyeMonth: 3, fyeDay: 31 });
    expect(r!.differences).toContainEqual(expect.objectContaining({ code: "A001", kind: "yearEnd", records: "31 December", list: "31 March" }));
  });

  it("the difference stays listed on later runs, although the company now carries the list's year end", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    await applyClientList(ctx, list([entry({ code: "A001", yearEnd: { month: 3, day: 31 } })], "v1"));
    const r = await applyClientList(ctx, list([entry({ code: "A001", yearEnd: { month: 3, day: 31 } })], "v2"));
    expect(r!.differences).toContainEqual(expect.objectContaining({ code: "A001", kind: "yearEnd", records: "31 December", list: "31 March" }));
  });

  it("a year end the records lack is filled from the list, and counted, not listed as a difference", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    const r = await applyClientList(ctx, list([entry({ code: "B002", yearEnd: { month: 6, day: 30 } })]));
    expect(await get(ctx, "cl_b")).toMatchObject({ fyeMonth: 6, fyeDay: 30 });
    expect(r!.counts.yearEndsFilled).toBe(1);
    expect(r!.differences.filter((d) => d.kind === "yearEnd")).toEqual([]);
  });

  it("an incorporation date that differs is listed, and the records' date is kept because the annual return runs from it", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    const r = await applyClientList(ctx, list([entry({ code: "A001", incorporatedOn: "2015-11-02" })]));
    expect((await get(ctx, "cl_a")).incorporatedOn).toBe("2015-11-20");
    expect(r!.differences).toContainEqual(expect.objectContaining({ code: "A001", kind: "incorporatedOn", records: "2015-11-20", list: "2015-11-02" }));
  });

  it("the list's AGM month is kept with the company", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    await applyClientList(ctx, list([entry({ code: "A001", agmMonth: 5 })]));
    expect(((await get(ctx, "cl_a")).jurisdictionData as { clientList: { agmMonth: number } }).clientList.agmMonth).toBe(5);
  });

  it("contact emails from the list are added to the company once, however often the list is read", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    await applyClientList(ctx, list([entry({ code: "A001", contactEmails: ["Finance@Alpha.example", "boss@alpha.example"] })], "v1"));
    await applyClientList(ctx, list([entry({ code: "A001", contactEmails: ["finance@alpha.example"] })], "v2"));
    const k = await ctx.db.select().from(contact).where(eq(contact.clientId, "cl_a"));
    expect(k.map((x) => x.email).sort()).toEqual(["boss@alpha.example", "finance@alpha.example"]);
  });

  it("a company in the records and not in the list, and a current client in the list and not in the records, are both listed", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    const r = await applyClientList(ctx, list([entry({ code: "A001" }), entry({ code: "Z999" }), entry({ code: "Y888", live: false, leftOutReason: "struck" })]));
    expect(r!.differences).toContainEqual(expect.objectContaining({ code: "B002", kind: "notInList" }));
    expect(r!.differences).toContainEqual(expect.objectContaining({ code: "Z999", kind: "notInRecords" }));
    expect(r!.differences.find((d) => d.code === "Y888")).toBeUndefined();
  });

  // Found on the first real run: one firm's records write a client code with letters after it that
  // its client list leaves off, so half its companies were not matched. How the two line up is the
  // list's to say. And a shared code is not proof: the name has to agree too.
  it("a company is matched through the list's own way of reading the records' codes", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    await ctx.db.update(client).set({ code: "A001K" }).where(eq(client.id, "cl_a"));
    const src = { ...list([entry({ code: "A001", nameEn: "Alpha Limited", agmMonth: 5 })]), codeKey: (code: string) => code.replace(/[A-Z]+$/, "") };
    const r = await applyClientList(ctx, src);
    expect(r!.counts.matched).toBe(1);
    expect(((await get(ctx, "cl_a")).jurisdictionData as { clientList: { agmMonth: number } }).clientList.agmMonth).toBe(5);
  });

  it("a company whose code matches but whose name is another company's is left untouched, and is listed for staff", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    const r = await applyClientList(ctx, list([entry({ code: "A001", nameEn: "Zebra Trading Limited", live: false, leftOutReason: "struck", yearEnd: { month: 3, day: 31 } })]));
    expect(await get(ctx, "cl_a")).toMatchObject({ fyeMonth: 12, fyeDay: 31 });
    expect(((await get(ctx, "cl_a")).jurisdictionData as { clientList?: unknown }).clientList).toBeUndefined();
    expect(r!.differences).toContainEqual(expect.objectContaining({ code: "A001", kind: "nameMismatch", records: "Alpha Limited", list: "Zebra Trading Limited" }));
    expect(r!.counts.matched).toBe(0);
  });

  it("a company matched on its code alone by an earlier build has that undone once the names are seen to differ", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    // What the earlier build left behind: marked as no longer a client, with the list's year end.
    await ctx.db.update(client).set({ fyeMonth: 3, fyeDay: 31, jurisdictionData: { fromRecords: { fyeMonth: 12, fyeDay: 31 }, clientList: { live: false, reason: "struck", agmMonth: null, noAgm: null } } }).where(eq(client.id, "cl_a"));
    await applyClientList(ctx, list([entry({ code: "A001", nameEn: "Zebra Trading Limited", live: false, leftOutReason: "struck", yearEnd: { month: 3, day: 31 } })]));
    const after = await get(ctx, "cl_a");
    expect(after).toMatchObject({ fyeMonth: 12, fyeDay: 31 });
    expect((after.jurisdictionData as { clientList?: unknown }).clientList).toBeUndefined();
    await syncCases(ctx, { withinDays: 60 });
    expect((await listCases(ctx)).map((c) => c.clientCode)).toContain("A001");
  });

  it("a new build reads the list again even though the list itself has not changed", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    const src = list([entry({ code: "A001", agmMonth: 5 })], "v1");
    await applyClientList(ctx, src, { build: "aaa" });
    expect(await applyClientList(ctx, src, { build: "aaa" })).toBeNull();
    expect(await applyClientList(ctx, src, { build: "bbb" })).not.toBeNull();
  });

  it("a name that differs only in case, punctuation, the company suffix or a note in brackets is the same company", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    const r = await applyClientList(ctx, list([entry({ code: "A001", nameEn: "ALPHA LTD. *(formerly Old Name Limited)" }), entry({ code: "B002", nameEn: "Beta Co., Limited" })]));
    expect(r!.counts.matched).toBe(2);
    expect(r!.differences.filter((d) => d.kind === "nameMismatch")).toEqual([]);
  });

  it("a list that has not changed is not applied again, and the last report is kept", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    await applyClientList(ctx, list([entry({ code: "A001", live: false, leftOutReason: "struck" })], "v1"));
    expect(await applyClientList(ctx, list([], "v1"))).toBeNull();
    expect((await readClientListReport(ctx))!.counts.leftOut).toBe(1);
  });

  it("a newer copy of the records makes the list apply again, because the copy brings back the records' own year ends", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    const src = list([entry({ code: "A001", yearEnd: { month: 3, day: 31 } })], "v1");
    await applyClientList(ctx, src);
    await ctx.db.update(client).set({ fyeMonth: 12, fyeDay: 31 }).where(eq(client.id, "cl_a"));
    await applyClientList(ctx, src, { force: true });
    expect(await get(ctx, "cl_a")).toMatchObject({ fyeMonth: 3, fyeDay: 31 });
  });
});

describe("the client list in the annual cycle", () => {
  beforeEach(async () => { await resetDb(); });
  const records: RecordsSource = { label: "the registers", asAt: async () => null, refresh: async () => null, nar1Input: async () => { throw new Error("unused"); }, dispatchFacts: async () => { throw new Error("unused"); }, particulars: async () => { throw new Error("unused"); } };
  const deps = (clientList: ClientListSource | null): CycleDeps => ({ records, clientList, mail: null, sync: { mailboxes: [], firmDomains: [], lookbackDays: 30 }, statusDir: null, withinDays: 60 });

  it("the list is read before cases are opened, so a former client never appears", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    const h = await runAnnualCycle(ctx, deps(list([entry({ code: "A001", live: false, leftOutReason: "struck" }), entry({ code: "B002" })])));
    expect(h.errors).toEqual({});
    expect(h.clientListReadAt).toBe("2026-12-05T02:00:00.000Z");
    expect((await listCases(ctx)).map((c) => c.clientCode)).toEqual(["B002"]);
  });

  it("a list that cannot be read is reported, and cases are still opened from the records", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    const broken: ClientListSource = { label: "the client workbook", read: async () => { throw new Error("The client workbook is open on someone's computer"); } };
    const h = await runAnnualCycle(ctx, deps(broken));
    expect(h.errors.clientList).toMatch(/open on someone's computer/);
    expect((await listCases(ctx)).length).toBe(2);
  });

  it("an installation with no client list runs as before", async () => {
    const ctx = makeCtx({ now: "2026-12-05T02:00:00Z" }); await seed(ctx);
    const h = await runAnnualCycle(ctx, deps(null));
    expect(h.errors).toEqual({});
    expect((await listCases(ctx)).length).toBe(2);
  });
});

// The name check exists to stop a reused or mistyped code joining two different companies. On the
// first real run it also rejected six pairs the owner could see were one company: a contraction
// (INT'L for INTERNATIONAL), LTD for LIMITED, and one typing mistake.
describe("whether two names are the same company's", () => {
  it("a usual contraction is the same name", () => {
    expect(sameCompanyName("Harbour Lantern International Holdings Limited", "HARBOUR LANTERN INT'L HLDGS LTD")).toBe(true);
    expect(sameCompanyName("Harbour Lantern (Hong Kong) Company Limited", "Harbour Lantern (HK) Co. Ltd")).toBe(true);
    expect(sameCompanyName("Lantern & Harbour Investment Limited", "Lantern and Harbour Inv. Ltd.")).toBe(true);
  });

  it("a typing mistake of a letter or two in a long name is the same name", () => {
    expect(sameCompanyName("Harbour Lantern Trading Limited", "Harbour Lantren Trading Limited")).toBe(true);
    expect(sameCompanyName("Harbour Lantern Trading Limited", "Harbour Lantern Tradng Limited")).toBe(true);
  });

  it("a different company is still a different company", () => {
    expect(sameCompanyName("Alpha Limited", "Zebra Trading Limited")).toBe(false);
    expect(sameCompanyName("Harbour Lantern Trading Limited", "Harbour Lantern Properties Limited")).toBe(false);
    // Short names leave no room for a typing mistake: one letter is another company.
    expect(sameCompanyName("Alta Limited", "Alfa Limited")).toBe(false);
  });
});
