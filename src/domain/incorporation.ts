import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Ctx } from "@/lib/ctx";
import { task as taskT, significantController } from "@/db/schema";
import type { Task } from "./engine";
import { callAgent } from "@/agent/call";
import { Crypto } from "@/lib/crypto";
import { createPerson, appoint, updateClient } from "./records";
import { createShareClass, allot } from "./shares";
import { getFirm } from "./firm";

const text = z.string().trim().min(1);
export const IncorporationZ = z.object({
  nameEn: text, nameZh: z.string().nullable(), natureDescription: text, registeredOffice: text,
  capital: z.object({ className: text, currency: z.literal("HKD"), number: z.number().int().positive(), subscribedCents: z.number().int().positive(), paidUpCents: z.number().int().positive() }),
  founder: z.object({ nameEn: text, nameZh: z.string().nullable(), address: text }),
  director: z.object({ nameEn: text, nameZh: z.string().nullable(), correspondenceAddress: text, residentialAddress: text, idNumber: text, idCountry: z.string().nullable(), email: z.string().email(), adult: z.literal(true), consentToAct: z.literal(true) }),
  secretaryIsFirm: z.literal(true),
});
export type IncorporationPlan = z.infer<typeof IncorporationZ> & { founderPersonId: string; directorPersonId: string };

/** Supported initial shape: sole individual founder/director, fully paid HKD class,
 * and the servicing firm as corporate secretary. The instruction must state all facts. */
export async function incorporationFor(ctx: Ctx, t: Task, values: Record<string, string>): Promise<IncorporationPlan> {
  const instruction = JSON.stringify(Object.fromEntries(["propName", "business", "founders", "capital", "directorsList", "scList", "funds"].map(k => [k, values[k] ?? ""])));
  const hash = Crypto.sha256(instruction);
  const saved = t.params.incorporation as { hash: string; encrypted: string } | undefined;
  if (saved?.hash === hash) return JSON.parse(ctx.crypto.decrypt(saved.encrypted)) as IncorporationPlan;
  const plan = await callAgent(ctx, {
    agent: "structure_incorporation", taskId: t.id, schema: IncorporationZ,
    system: "Extract the explicitly instructed Hong Kong private-company incorporation particulars. Supported shape is ONE individual founder who is also the ONE individual first director, ONE fully paid HKD share class, and the servicing firm as corporate secretary. Do not omit additional parties/classes to fit this schema: return invalid output if the instruction exceeds this shape. Require explicit registered office, founder address, director identity and residential/correspondence addresses, adult confirmation, consent to act and firm-secretary choice. Do not infer any missing facts. Monetary amounts are cents. No default addresses, cash values or consents.",
    user: instruction,
  });
  if (plan.founder.nameEn.trim().toLowerCase() !== plan.director.nameEn.trim().toLowerCase() || plan.capital.subscribedCents !== plan.capital.paidUpCents) throw new Error("NNC1: this workflow supports one individual founder/director with fully paid capital; other structures require manual preparation.");
  // Identity records are drafts; no appointment, holding or client activation occurs here.
  const person = await createPerson(ctx, { ...plan.director });
  const result = { ...plan, founderPersonId: person.id, directorPersonId: person.id };
  t.params = { ...t.params, incorporation: { hash, encrypted: ctx.crypto.encrypt(JSON.stringify(result)) } };
  await ctx.db.update(taskT).set({ params: t.params }).where(and(eq(taskT.id, t.id), eq(taskT.firmId, ctx.firmId)));
  return result;
}

export async function planIncorporationRegister(ctx: Ctx, t: Task, values: Record<string, string>) {
  const plan = await incorporationFor(ctx, t, values);
  const registered = t.params.incorporationRegistration as { companyNumber?: string; incorporatedOn?: string } | undefined;
  if (!registered?.companyNumber?.trim() || !registered.incorporatedOn || !/^\d{4}-\d{2}-\d{2}$/.test(registered.incorporatedOn) || new Date(`${registered.incorporatedOn}T00:00:00Z`).toISOString().slice(0, 10) !== registered.incorporatedOn) throw new Error("Enter the registered company number and incorporation date from the certificate before setting up the registers.");
  const date = registered.incorporatedOn;
  return [{ effect: "activate_client" as const, description: `Incorporate ${plan.nameEn} (${registered.companyNumber}) on ${date}; appoint ${plan.director.nameEn} and the firm secretary, issue ${plan.capital.number} ${plan.capital.className} shares to ${plan.founder.nameEn}, and enter the sole shareholder in the controllers register.`, apply: async () => {
    const firm = await getFirm(ctx);
    const secretary = await ctx.db.query.person.findFirst({ where: (p, { and, eq }) => and(eq(p.id, "per_firm"), eq(p.firmId, ctx.firmId)) }) ?? await createPerson(ctx, { id: "per_firm", kind: "corporate", nameEn: firm.legalName, nameZh: firm.legalNameZh, correspondenceAddress: firm.address, email: firm.email });
    await updateClient(ctx, t.clientId, { nameEn: plan.nameEn, nameTc: plan.nameZh, companyNumber: registered.companyNumber, incorporatedOn: date, regOfficeEn: plan.registeredOffice, businessNatureEn: plan.natureDescription, lifecycle: "active", operatingStatus: "operating" }, `Incorporation ${t.id}`);
    await appoint(ctx, { clientId: t.clientId, personId: plan.directorPersonId, role: "director", fromDate: date, sourceTaskId: t.id });
    await appoint(ctx, { clientId: t.clientId, personId: secretary.id, role: "secretary", fromDate: date, sourceTaskId: t.id });
    const cls = await createShareClass(ctx, { clientId: t.clientId, name: plan.capital.className, currency: plan.capital.currency });
    await allot(ctx, { clientId: t.clientId, shareClassId: cls.id, toPersonId: plan.founderPersonId, quantity: plan.capital.number, amountPaidCents: plan.capital.paidUpCents, date, sourceTaskId: t.id });
    await ctx.db.insert(significantController).values({ id: ctx.ids.next("scr"), firmId: ctx.firmId, clientId: t.clientId, personId: plan.founderPersonId, nature: "Holds 100% of the issued shares", registrableFrom: date, sourceTaskId: t.id });
  } }];
}
