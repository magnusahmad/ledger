// Declarative register effects from playbook data, applied only after a human approves
// the previewed change (AGENTS.md: no register change without a click).
import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { appointment, businessRegistration, client as clientT, screeningResult } from "@/db/schema";
import type { RegisterEffect } from "./playbook-types";
import { appoint, ceaseAppointment, updateClient, updateRegisteredPerson, type PersonInput } from "./records";
import { getTask, hasCurrentCdd, stepData } from "./engine";
import { getPlaybook } from "./playbooks";
import { addMonths } from "./dates";

import { assertRegisterGuard, registerGuardFor } from "./register-guards";
import { particularsFor, fyeFor } from "./particulars";

type Change = { effect: RegisterEffect["kind"]; description: string; apply: () => Promise<void> };

export async function planRegisterChanges(ctx: Ctx, taskId: string): Promise<Change[]> {
  const t = await getTask(ctx, taskId);
  const pb = await getPlaybook(ctx, t.playbookId, t.playbookVersion);
  const cl = (await ctx.db.query.client.findFirst({ where: and(eq(clientT.id, t.clientId), eq(clientT.firmId, ctx.firmId)) }))!;
  const person = t.personId ? await ctx.db.query.person.findFirst({ where: (p, { and, eq }) => and(eq(p.id, t.personId!), eq(p.firmId, ctx.firmId)) }) : null;
  const v: Record<string, string> = {};
  for (const e of t.checklist) if (e.value) v[e.key] = e.value;
  const eff = t.effectiveDate ?? v.effDate ?? ctx.clock.today();
  const out: Change[] = [];
  for (const e of pb.registerEffects) {
    switch (e.kind) {
      case "appoint_officer": {
        const firmPerson = e.role === "secretary" && ["hk.changeSecretary", "hk.transferIn"].includes(pb.id) ? await ensureFirmPerson(ctx) : null;
        const pid = firmPerson?.id ?? person?.id;
        if (!pid) break;
        const name = firmPerson?.nameEn ?? person!.nameEn;
        if (firmPerson) {
          const existing = await ctx.db.query.appointment.findFirst({ where: and(eq(appointment.firmId, ctx.firmId), eq(appointment.clientId, t.clientId), eq(appointment.personId, pid), eq(appointment.role, "secretary"), lte(appointment.fromDate, eff), or(isNull(appointment.toDate), gt(appointment.toDate, eff))) });
          if (existing) {
            out.push({ effect: e.kind, description: `Confirm ${name} remains secretary; retain the appointment from ${existing.fromDate}`, apply: async () => {} });
            break;
          }
        }
        out.push({ effect: e.kind, description: `Appoint ${name} as ${e.role.replace("_", " ")} with effect from ${eff}`, apply: async () => { await assertRegisterGuard(ctx, registerGuardFor(pb.id, e), t.clientId, eff); await appoint(ctx, { clientId: t.clientId, personId: pid, role: e.role as never, fromDate: eff, sourceTaskId: t.id }); } });
        break;
      }
      case "cease_officer": {
        const current = await ctx.db.select().from(appointment).where(and(eq(appointment.firmId, ctx.firmId), eq(appointment.clientId, t.clientId), eq(appointment.role, e.role as never), isNull(appointment.toDate)));
        const ownSecretary = e.role === "secretary" && pb.id !== "hk.resignSecretary" ? await ensureFirmPerson(ctx) : null;
        const targets = ownSecretary ? current.filter((a) => a.personId !== ownSecretary.id) : current.filter((a) => a.personId === person?.id);
        if (pb.id === "hk.resignSecretary" && !targets.length) throw new Error("Select a current secretary of this company for resignation");
        if (e.role === "secretary" && pb.id === "hk.transferIn" && !targets.length) break;
        const date = v.lastDay ?? eff;
        for (const a of targets) out.push({ effect: e.kind, description: `End ${e.role} appointment (${a.personId === person?.id ? person?.nameEn : a.personId}) on ${date}`, apply: async () => { await assertRegisterGuard(ctx, registerGuardFor(pb.id, e), t.clientId, date, targets.map(a => a.personId)); await ceaseAppointment(ctx, a.id, date, t.id); } });
        break;
      }
      case "replace_officer": {
        if (!person) break;
        const current = await ctx.db.select().from(appointment).where(and(eq(appointment.firmId, ctx.firmId), eq(appointment.clientId, t.clientId), eq(appointment.role, e.role as never), isNull(appointment.toDate)));
        let warning = "";
        if (e.role === "legal_representative") {
          const officers = await ctx.db.select().from(appointment).where(and(eq(appointment.clientId, t.clientId), eq(appointment.personId, person.id), isNull(appointment.toDate)));
          if (!officers.some((a) => a.role === "director" || a.role === "manager")) warning = ` Blocked: under the 2024 Company Law (art. 10) the legal representative must be a director or manager who executes company affairs; appoint ${person.nameEn} as director or manager first.`;
        }
        out.push({ effect: e.kind, description: `${person.nameEn} becomes ${e.role.replace(/_/g, " ")} from ${eff}${current.length ? `, replacing ${current.map((a) => a.personId).join(", ")}` : ""}.${warning}`, apply: async () => {
          if (warning) throw new Error(warning.trim());
          for (const a of current) if (a.personId !== person.id) await ceaseAppointment(ctx, a.id, eff, t.id);
          if (!current.some((a) => a.personId === person.id)) await appoint(ctx, { clientId: t.clientId, personId: person.id, role: e.role as never, fromDate: eff, sourceTaskId: t.id });
        } });
        break;
      }
      case "update_person_particulars": {
        if (!person) throw new Error("Select the person whose particulars changed");
        const proposed = await particularsFor(ctx, t, v.changeDetail ?? "");
        const keys: Record<string, keyof PersonInput> = { nameEn: "nameEn", nameZh: "nameZh", resAddr: "residentialAddress", corrAddr: "correspondenceAddress", email: "email", idNo: "idNumber", idCountry: "idCountry" };
        const patch: Partial<PersonInput> = {};
        for (const change of proposed.changes) Object.assign(patch, { [keys[change.field]]: change.value });
        const detail = proposed.changes.map(c => `${keys[c.field]}: ${["idNo", "resAddr"].includes(c.field) ? "protected value changed (review the ND2B private sheet)" : c.value}`).join("; ");
        out.push({ effect: e.kind, description: `Update ${person.nameEn}: ${detail}`, apply: async () => { await updateRegisteredPerson(ctx, t.clientId, person.id, patch, eff, t.id); } });
        break;
      }
      case "change_fye": {
        const fye = await fyeFor(ctx, t, v.newFye ?? "");
        out.push({ effect: e.kind, description: `Financial year end: ${cl.fyeDay}/${cl.fyeMonth} → ${fye.day}/${fye.month}; first period ends ${fye.firstPeriodEnd}`, apply: async () => {
          await updateClient(ctx, cl.id, { fyeDay: fye.day, fyeMonth: fye.month, jurisdictionData: { ...cl.jurisdictionData, firstChangedPeriodEnd: fye.firstPeriodEnd, fyeChange: { previousMonth: cl.fyeMonth, previousDay: cl.fyeDay, effectiveFrom: eff, firstPeriodEnd: fye.firstPeriodEnd } } }, `Approved task ${t.id}`);
        } });
        break;
      }
      case "record_cdd_review": {
        const idx = t._steps.findIndex(s => s.kind === "screen" || s.kind === "kyc");
        if (idx < 0 || !stepData(t, idx).cleared) throw new Error("Complete screening before recording the CDD review");
        const { peopleToScreen } = await import("./screening");
        const ids = await peopleToScreen(ctx, t);
        if (!ids.length) throw new Error("CDD review has no person to verify");
        const results = await ctx.db.select().from(screeningResult).where(and(eq(screeningResult.firmId, ctx.firmId), eq(screeningResult.taskId, t.id)));
        for (const id of ids) if (!await hasCurrentCdd(ctx, id) || !results.some(r => r.personId === id && ["clear", "cleared_by_staff"].includes(r.status))) throw new Error("Current CDD and cleared screening are required for every person");
        out.push({ effect: e.kind, description: `Record completed CDD review for ${ids.length} screened person(s); existing current records retained`, apply: async () => {} });
        break;
      }
      case "change_capital": {
        const text = v.cnCapitalChange ?? v.twCapitalIncrease;
        if (text) out.push({ effect: e.kind, description: `Registered capital: ${text}`, apply: async () => { await updateClient(ctx, cl.id, { jurisdictionData: { ...cl.jurisdictionData, capitalChange: { text, on: eff } } }, `Task ${t.id}`); } });
        break;
      }
      case "change_registered_office": {
        const addr = pb.id === "hk.transferIn" ? "18/F, 88 Caine Road, Mid-Levels, Hong Kong" : v.newAddr ?? v.cnNewAddress;
        if (addr) out.push({ effect: e.kind, description: `Registered office: ${cl.regOfficeEn ?? "—"} → ${addr}`, apply: async () => { await updateClient(ctx, cl.id, { regOfficeEn: addr }, `Task ${t.id}`); } });
        break;
      }
      case "change_name": if (v.newName) out.push({ effect: e.kind, description: `Company name: ${cl.nameEn} → ${v.newName} (effective on the certificate of change of name)`, apply: async () => {
        const zh = v.newName.match(/[㐀-鿿]+[㐀-鿿（）()]*/)?.[0];
        const en = v.newName.match(/[A-Za-z][A-Za-z0-9&.,'()\- ]*Limited/i)?.[0]?.trim() ?? (zh ? cl.nameEn : v.newName);
        await updateClient(ctx, cl.id, { nameEn: en, ...(zh ? { nameTc: zh } : {}) }, `Task ${t.id}`);
      } }); break;
      case "activate_client": if (pb.id === "hk.incorporation") { const { planIncorporationRegister } = await import("./incorporation"); out.push(...await planIncorporationRegister(ctx, t, v)); break; } out.push({ effect: e.kind, description: `Mark ${cl.nameEn} as an active client`, apply: async () => { await updateClient(ctx, cl.id, { lifecycle: "active" }, `Task ${t.id}`); } }); break;
      case "record_agm": out.push({ effect: e.kind, description: `Record AGM / written resolutions on ${ctx.clock.today()}`, apply: async () => { await updateClient(ctx, cl.id, { jurisdictionData: { ...cl.jurisdictionData, lastAgm: ctx.clock.today() } }, `Task ${t.id}`); } }); break;
      case "renew_br": {
        const br = await ctx.db.query.businessRegistration.findFirst({ where: eq(businessRegistration.clientId, cl.id) });
        if (br?.expiresOn) { const years = Number(v.brTerm?.match(/3/) ? 3 : 1); const next = addMonths(br.expiresOn, 12 * years); out.push({ effect: e.kind, description: `Business registration valid until ${next}`, apply: async () => { await ctx.db.update(businessRegistration).set({ expiresOn: next, termYears: years }).where(eq(businessRegistration.id, br.id)); } }); }
        break;
      }
      case "set_operating_status": out.push({ effect: e.kind, description: `Company operating status: ${cl.operatingStatus} → ${e.status}`, apply: async () => { await updateClient(ctx, cl.id, { operatingStatus: e.status }, `Approved task ${t.id}`); } }); break;
      case "deregister": out.push({ effect: e.kind, description: "Mark the company as deregistering", apply: async () => { await updateClient(ctx, cl.id, { operatingStatus: "deregistering" }, `Task ${t.id}`); } }); break;
      case "change_auditor": if (v.newAuditor) out.push({ effect: e.kind, description: `Auditor: ${cl.auditor ?? "—"} → ${v.newAuditor}`, apply: async () => { await updateClient(ctx, cl.id, { auditor: v.newAuditor }, `Task ${t.id}`); } }); break;
      case "record_annual_return": out.push({ effect: e.kind, description: "Annual return recorded (clears this year's deadline)", apply: async () => {} }); break;
      default: {
        if (!["allot_shares", "transfer_shares", "buyback_shares", "update_controllers"].includes(e.kind)) {
          throw new Error(`Register effect ${e.kind} is not implemented. The task must stay open for staff attention.`);
        }
        const extra = await import("./register-effects-structured");
        const planned = await extra.planStructured(ctx, t, e, v, eff);
        out.push(...planned);
      }
    }
  }
  return out;
}

export async function applyRegisterChanges(ctx: Ctx, taskId: string) {
  return ctx.db.transaction(async db => {
    const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
    const task = await getTask(txCtx, taskId);
    await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`shares:${ctx.firmId}:${task.clientId}`}, 0))`);
    const changes = await planRegisterChanges(txCtx, taskId);
    for (const c of changes) await c.apply();
    return changes.map((c) => c.description);
  });
}

/** The firm itself, as corporate secretary. */
async function ensureFirmPerson(ctx: Ctx) {
  const ownId = `${ctx.firmId}:per_firm`;
  const existing = await ctx.db.query.person.findFirst({ where: (p, { and, eq, or }) => and(eq(p.firmId, ctx.firmId), or(eq(p.id, "per_firm"), eq(p.id, ownId))) });
  if (existing) return existing;
  const { createPerson } = await import("./records");
  const firm = await (await import("./firm")).getFirm(ctx);
  return createPerson(ctx, { id: ownId, kind: "corporate", nameEn: firm.legalName, nameZh: firm.legalNameZh, correspondenceAddress: firm.address, email: firm.email });
}
