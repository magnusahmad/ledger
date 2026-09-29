// Loads the fictional demo data (seed/demo-clients.json) into the target model, plus
// history for the showcase client (Kowloon Bay Trading Limited): KYC on file, documents,
// filings, past invoices, a completed annual return and past correspondence.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Ctx } from "@/lib/ctx";
import { ensureFirm } from "@/domain/firm";
import { addContact, appoint, createClient, createPerson } from "@/domain/records";
import { allot, createShareClass, transfer } from "@/domain/shares";
import { loadPlaybookLibrary } from "@/domain/playbooks";
import {
  bankAccount, businessRegistration, cddRecord, charge, conversation, document, filing, invoice, invoiceLine,
  message, payment, significantController, task, taskEvent, type Lang,
} from "@/db/schema";
import { simplePdf } from "@/documents/simple-pdf";
import { Crypto } from "@/lib/crypto";

type DemoClient = {
  id: string; name: Record<Lang, string>; cr: string; inc: string; fye: [number, number]; br: string; risk: string; kyc: string;
  contactName: string; lang: Lang; office: string; officeZh: string; directors: string[]; people: string[]; status: string;
  terms?: number; staff: string; type: string; op: string; group: string; listedSub: boolean; biz: { en: string; zh: string };
  docLang: string; brNo: string; brTerm: number; branches: string[]; accTo: string; lastAGM: string; lastAR: string; auditor: string;
  banks: [string, string, string][]; shares: [string, string, number, number, string][]; members: [string, string, number][];
  moves: [string, string, string][]; appointed: Record<string, string>; secSince: string; sc: [string, string, string][];
  charges: [string, string, string, string][];
  contacts: { name: string; role: string; ch: string; lang: Lang; billing?: boolean; sal?: Record<Lang, string> }[];
  filings: [string, string, string][];
  regsAt?: string;
};

const STAFF: Record<string, string> = { u1: "user_ky", u2: "user_mc", u3: "user_dh" };
const DOC_LANG: Record<string, "en" | "tc" | "sc"> = { English: "en", "Traditional Chinese": "tc", "Simplified Chinese": "sc" };
const OP: Record<string, "operating" | "dormant" | "not_incorporated"> = { Operating: "operating", Dormant: "dormant", "Not yet incorporated": "not_incorporated" };

// Fictional protected particulars for seeded people (never real data).
const PARTICULARS: Record<string, { id: string; res: string; email: string; phone: string; dob: string }> = {
  p1: { id: "Y123456(7)", res: "Flat 23A, Tower 2, Laguna City, Lam Tin, Kowloon", email: "chan.taiman@kbtrading.example", phone: "+852 9123 0001", dob: "1972-05-14" },
  p2: { id: "Z765432(1)", res: "Flat 8C, 12 Broadcast Drive, Kowloon Tong", email: "lee.siuling@example.com", phone: "+852 9123 0002", dob: "1975-11-02" },
  p3: { id: "R246810(2)", res: "House 5, 18 Headland Road, Repulse Bay", email: "wingyan@silverstrand.example", phone: "+852 9123 0003", dob: "1981-03-22" },
  p4: { id: "D135791(3)", res: "Flat 15F, 3 Tsing Yi Road, Tsing Yi", email: "kk.lam@tsingyilogistics.example", phone: "+852 9123 0004", dob: "1966-08-30" },
  p5: { id: "D975311(4)", res: "Flat 15F, 3 Tsing Yi Road, Tsing Yi", email: "meiling.lam@tsingyilogistics.example", phone: "+852 9123 0005", dob: "1969-01-19" },
  p6: { id: "G112233(5)", res: "Flat 2B, 9 Conduit Road, Mid-Levels", email: "cw.leung@example.com", phone: "+852 9123 0006", dob: "1978-12-07" },
};

const RISK: Record<string, "low" | "medium" | "high"> = { Low: "low", Medium: "medium", High: "high" };
const REVIEW_YEARS = { low: 3, medium: 2, high: 1 } as const;

export async function seedDemo(ctx: Ctx, opts: { demoEmail?: string | null } = {}) {
  await ensureFirm(ctx);
  await loadPlaybookLibrary(ctx);
  const data = JSON.parse(readFileSync(path.join(process.cwd(), "seed/demo-clients.json"), "utf8")) as {
    clients: DemoClient[]; people: Record<string, { name: string; zh: string; kyc: boolean; role: string }>;
  };

  const firmSecretary = await createPerson(ctx, { id: "per_firm", kind: "corporate", nameEn: "Caine Road Corporate Services Limited", nameZh: "堅道企業服務有限公司", correspondenceAddress: "18/F, 88 Caine Road, Mid-Levels, Hong Kong", email: "desk@caineroad.example" });

  const personIds: Record<string, string> = {};
  for (const [pid, p] of Object.entries(data.people)) {
    const part = PARTICULARS[pid];
    const email = pid === "p1" && opts.demoEmail ? opts.demoEmail : part.email;
    const row = await createPerson(ctx, {
      id: `per_${pid}`, nameEn: p.name, nameZh: p.zh, idType: "HKID", idNumber: part.id, idCountry: "Hong Kong",
      residentialAddress: part.res, correspondenceAddress: null, email, phone: part.phone, dateOfBirth: part.dob, nationality: "Chinese",
    });
    personIds[p.name] = row.id;
  }
  const corporates: Record<string, string> = {};
  async function personFor(name: string) {
    if (personIds[name]) return personIds[name];
    if (!corporates[name]) corporates[name] = (await createPerson(ctx, { kind: "corporate", nameEn: name })).id;
    return corporates[name];
  }

  for (const c of data.clients) {
    const risk = RISK[c.risk] ?? null;
    const cl = await createClient(ctx, {
      id: `cli_${c.id}`, code: c.id.toUpperCase(), jurisdiction: "HK", companyType: c.type,
      nameEn: c.name.en, nameTc: c.name.tc, nameSc: c.name.sc, companyNumber: c.cr || null,
      lifecycle: c.status === "Onboarding" ? "onboarding" : "active", operatingStatus: OP[c.op] ?? "operating",
      clientGroup: c.group || null, listedSubsidiary: c.listedSub, staffId: STAFF[c.staff] ?? "user_ky",
      messageLang: c.lang, docLang: DOC_LANG[c.docLang] ?? "en", riskRating: risk, paymentTermsDays: c.terms ?? 0,
      regOfficeEn: c.office || null, regOfficeZh: c.officeZh || null, businessNatureEn: c.biz.en, businessNatureZh: c.biz.zh,
      incorporatedOn: c.inc || null, fyeMonth: c.fye[0], fyeDay: c.fye[1], accountsLastMadeUpTo: c.accTo || null,
      auditor: c.auditor || null, registersKeptAt: c.regsAt ?? "Registered office", scrKeptAt: "Registered office",
      designatedRep: c.inc ? "Caine Road Corporate Services Limited (TCSP licensee)" : null,
      jurisdictionData: { lastAgm: c.lastAGM || null },
    });
    if (c.brNo) await ctx.db.insert(businessRegistration).values({ id: ctx.ids.next("br"), firmId: ctx.firmId, clientId: cl.id, brNumber: c.brNo, termYears: c.brTerm, expiresOn: c.br || null, branches: c.branches });
    for (const [bank, acct, sig] of c.banks) await ctx.db.insert(bankAccount).values({ id: ctx.ids.next("bka"), firmId: ctx.firmId, clientId: cl.id, bank, accountMasked: acct, signatories: sig });
    for (const pid of c.directors) await appoint(ctx, { clientId: cl.id, personId: `per_${pid}`, role: "director", fromDate: c.appointed[pid] ?? c.inc });
    if (c.secSince) await appoint(ctx, { clientId: cl.id, personId: firmSecretary.id, role: "secretary", fromDate: c.secSince });

    // Shares: allot on incorporation, then replay the recorded later movements.
    const classes: Record<string, string> = {};
    for (const [name, currency, , paid, voting] of c.shares) {
      classes[name] = (await createShareClass(ctx, { clientId: cl.id, name, currency, votingRights: voting === "Yes" })).id;
      void paid;
    }
    if (c.id === "c2") {
      await allot(ctx, { clientId: cl.id, shareClassId: classes.Ordinary, date: "2021-11-15", toPersonId: await personFor("HO Wing Yan"), quantity: 1000000, amountPaidCents: 100000000, note: "Allotment on incorporation" });
      await transfer(ctx, { clientId: cl.id, shareClassId: classes.Ordinary, date: "2023-06-30", fromPersonId: await personFor("HO Wing Yan"), toPersonId: await personFor("Brightwater Ventures Limited (BVI)"), quantity: 200000, considerationCents: 20000000, stampDutyCents: 40000, note: "Stamp duty paid" });
      await allot(ctx, { clientId: cl.id, shareClassId: classes.Preference, date: "2024-03-01", toPersonId: await personFor("Brightwater Ventures Limited (BVI)"), quantity: 200000, amountPaidCents: 20000000, note: "NSC1 filed" });
    } else {
      for (const [name, cls, qty] of c.members) {
        const shareRow = c.shares.find((s) => s[0] === cls)!;
        const perShare = shareRow[3] / shareRow[2];
        await allot(ctx, { clientId: cl.id, shareClassId: classes[cls], date: c.inc, toPersonId: await personFor(name), quantity: qty, amountPaidCents: Math.round(qty * perShare * 100), note: "Allotment on incorporation" });
      }
    }
    for (const [name, nature, since] of c.sc) await ctx.db.insert(significantController).values({ id: ctx.ids.next("scr"), firmId: ctx.firmId, clientId: cl.id, personId: await personFor(name), nature, registrableFrom: since });
    for (const [created, chargee, desc] of c.charges) await ctx.db.insert(charge).values({ id: ctx.ids.next("chg"), firmId: ctx.firmId, clientId: cl.id, description: desc, chargee, createdOn: created });
    for (const [form, desc, filed] of c.filings) {
      const year = filed.slice(0, 4);
      await ctx.db.insert(filing).values({ id: ctx.ids.next("fil"), firmId: ctx.firmId, clientId: cl.id, form, description: desc, filedOn: filed, periodKey: form === "NAR1" ? `NAR1:${desc.match(/\d{4}/)?.[0] ?? year}` : null, reference: `CR-${form}-${filed.replace(/-/g, "")}` });
    }
    for (const ct of c.contacts) {
      const emailMatch = ct.ch.match(/[\w.+-]+@[\w.-]+/);
      const pid = personIds[ct.name];
      let email = emailMatch?.[0] ?? (pid ? PARTICULARS[pid.replace("per_", "")]?.email : null) ?? null;
      if (c.id === "c1" && ct.name === "CHAN Tai Man" && opts.demoEmail) email = opts.demoEmail;
      await addContact(ctx, {
        clientId: cl.id, personId: pid ?? null, name: ct.name, role: ct.role, email,
        channel: ct.ch.startsWith("WeChat") ? "wechat" : "email", language: ct.lang, isBilling: !!ct.billing,
        isInstructing: /instruction/i.test(ct.role) || /Director/.test(ct.role), salutation: ct.sal ?? null,
      });
    }
    // CDD on file for directors and controllers whose KYC is recorded.
    if (c.kyc && risk) {
      for (const pid of c.people) {
        const due = new Date(c.kyc + "T00:00:00Z"); due.setUTCFullYear(due.getUTCFullYear() + REVIEW_YEARS[risk]);
        await ctx.db.insert(cddRecord).values({ id: ctx.ids.next("cdd"), firmId: ctx.firmId, personId: `per_${pid}`, riskRating: risk, verifiedOn: c.kyc, reviewDueOn: due.toISOString().slice(0, 10) });
      }
    }
  }

  await seedShowcaseHistory(ctx);
}

async function storeDoc(ctx: Ctx, d: { clientId?: string; personId?: string; taskId?: string; kind: string; title: string; lines: string[]; createdAt: string; source?: "seed" | "generated" | "signed" | "email"; requirementKey?: string }) {
  const pdf = await simplePdf(d.title, d.lines);
  const id = ctx.ids.next("doc");
  const key = `documents/${id}.pdf`;
  await ctx.storage.put(key, pdf);
  await ctx.db.insert(document).values({
    id, firmId: ctx.firmId, clientId: d.clientId ?? null, personId: d.personId ?? null, taskId: d.taskId ?? null, kind: d.kind, title: d.title,
    storageKey: key, mime: "application/pdf", sha256: Crypto.sha256(pdf), source: d.source ?? "seed", requirementKey: d.requirementKey ?? null,
    createdAt: new Date(d.createdAt + "T09:00:00+08:00"),
  });
  return id;
}

async function seedShowcaseHistory(ctx: Ctx) {
  const cid = "cli_c1";
  await storeDoc(ctx, { clientId: cid, kind: "certificate", title: "Certificate of Incorporation", lines: ["Kowloon Bay Trading Limited", "Company number 2811043", "Incorporated 28 October 2019", "(Fictional demo document)"], createdAt: "2019-10-28" });
  await storeDoc(ctx, { clientId: cid, kind: "articles", title: "Articles of Association", lines: ["Kowloon Bay Trading Limited", "Adopted 28 October 2019", "(Fictional demo document)"], createdAt: "2019-10-28" });
  await storeDoc(ctx, { clientId: cid, kind: "certificate", title: "Business Registration Certificate 2025-26", lines: ["BR number 70123456", "Valid until 27 October 2026", "(Fictional demo document)"], createdAt: "2025-10-20" });
  await storeDoc(ctx, { personId: "per_p1", kind: "id_copy", title: "HKID copy: CHAN Tai Man", lines: ["Identity document copy on file", "(Fictional demo document)"], createdAt: "2024-11-02", requirementKey: "idCopy" });
  await storeDoc(ctx, { personId: "per_p1", kind: "address_proof", title: "Address proof: CHAN Tai Man (utility bill)", lines: ["CLP bill, October 2024", "(Fictional demo document)"], createdAt: "2024-11-02", requirementKey: "addrProof" });
  await storeDoc(ctx, { personId: "per_p2", kind: "id_copy", title: "HKID copy: LEE Siu Ling", lines: ["Identity document copy on file", "(Fictional demo document)"], createdAt: "2024-11-02", requirementKey: "idCopy" });

  // Completed annual return task for 2025, with its invoice paid.
  const taskId = "tsk_seed_ar2025";
  await ctx.db.insert(task).values({
    id: taskId, firmId: ctx.firmId, clientId: cid, playbookId: "hk.annualReturn", playbookVersion: 2, title: "Annual return 2025",
    assigneeId: "user_ky", status: "done", stepIndex: 8, checklist: [{ key: "changesSince", status: "received", value: "No changes since the last return" }],
    periodKey: "NAR1:2025", dueDate: "2025-12-09", createdAt: new Date("2025-10-28T10:00:00+08:00"), completedAt: new Date("2025-12-05T16:00:00+08:00"),
  });
  await ctx.db.insert(taskEvent).values([
    { id: ctx.ids.next("evt"), firmId: ctx.firmId, taskId, kind: "task.created", summary: "Opened from the deadline calendar", actor: "system", at: new Date("2025-10-28T10:00:00+08:00") },
    { id: ctx.ids.next("evt"), firmId: ctx.firmId, taskId, kind: "filing.recorded", summary: "NAR1 filed, reference CR-NAR1-20251205", actor: "user_ky", at: new Date("2025-12-05T15:30:00+08:00") },
    { id: ctx.ids.next("evt"), firmId: ctx.firmId, taskId, kind: "task.done", summary: "Task completed", actor: "system", at: new Date("2025-12-05T16:00:00+08:00") },
  ]);
  await storeDoc(ctx, { clientId: cid, taskId, kind: "form", title: "Form NAR1 (2025), filed", lines: ["Annual return made up to 28 October 2025", "Filed 5 December 2025", "(Fictional demo document)"], createdAt: "2025-12-05", source: "generated" });

  const invId = "inv_seed_2025_0042";
  await ctx.db.insert(invoice).values({ id: invId, firmId: ctx.firmId, clientId: cid, number: "CRCS-2025-0042", status: "paid", issuedOn: "2025-10-28", dueOn: "2025-11-27", termsDays: 30, totalCents: 130500, paidCents: 130500, xeroStatus: "not_synced", createdAt: new Date("2025-10-28T10:05:00+08:00") });
  await ctx.db.insert(invoiceLine).values([
    { id: ctx.ids.next("inl"), firmId: ctx.firmId, invoiceId: invId, taskId, description: "Annual return 2025", amountCents: 120000, kind: "fee", sort: 0 },
    { id: ctx.ids.next("inl"), firmId: ctx.firmId, invoiceId: invId, taskId, description: "Annual registration fee (Companies Registry)", amountCents: 10500, kind: "disbursement", sort: 1 },
  ]);
  await ctx.db.insert(payment).values({ id: ctx.ids.next("pay"), firmId: ctx.firmId, invoiceId: invId, amountCents: 130500, receivedOn: "2025-11-18", method: "bank_auto" });
  const inv2 = "inv_seed_2025_0063";
  await ctx.db.insert(invoice).values({ id: inv2, firmId: ctx.firmId, clientId: cid, number: "CRCS-2025-0063", status: "paid", issuedOn: "2025-11-20", dueOn: "2025-12-20", termsDays: 30, totalCents: 250000, paidCents: 250000, createdAt: new Date("2025-11-20T10:05:00+08:00") });
  await ctx.db.insert(invoiceLine).values({ id: ctx.ids.next("inl"), firmId: ctx.firmId, invoiceId: inv2, description: "AGM and accounts approval 2025", amountCents: 250000, kind: "fee", sort: 0 });
  await ctx.db.insert(payment).values({ id: ctx.ids.next("pay"), firmId: ctx.firmId, invoiceId: inv2, amountCents: 250000, receivedOn: "2025-12-10", method: "bank_auto" });

  // Past correspondence.
  const conv = "cnv_seed_c1";
  await ctx.db.insert(conversation).values({ id: conv, firmId: ctx.firmId, clientId: cid, channel: "email", subject: "Annual return 2025", counterpartyEmail: "chan.taiman@kbtrading.example", lastMessageAt: new Date("2025-11-03T09:12:00+08:00") });
  await ctx.db.insert(message).values([
    { id: ctx.ids.next("msg"), firmId: ctx.firmId, conversationId: conv, direction: "out", status: "sent", fromAddr: "desk@caineroad.example", toAddrs: ["chan.taiman@kbtrading.example"], subject: "Annual return 2025", language: "tc", text: "陳生：\n\n九龍灣貿易有限公司的周年申報表將於2025年12月9日到期。請確認自上次申報後股東、董事或地址是否有任何變更。\n\n葉嘉欣", at: new Date("2025-10-28T10:06:00+08:00") },
    { id: ctx.ids.next("msg"), firmId: ctx.firmId, conversationId: conv, direction: "in", status: "received", fromAddr: "chan.taiman@kbtrading.example", fromName: "CHAN Tai Man", toAddrs: ["desk@caineroad.example"], subject: "Re: Annual return 2025", language: "tc", text: "Karen，冇變更，照舊就得。已經過咗數。", at: new Date("2025-11-03T09:12:00+08:00"), processedAt: new Date("2025-11-03T09:13:00+08:00") },
  ]);
}
