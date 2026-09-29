// Declarative register effects from playbook data, applied only after a human approves
// the previewed change (AGENTS.md: no register change without a click).
import { and, eq, isNull } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { appointment, businessRegistration, client as clientT } from "@/db/schema";
import type { RegisterEffect } from "./playbook-types";
import { appoint, ceaseAppointment, updateClient } from "./records";
import { getTask } from "./engine";
import { getPlaybook } from "./playbooks";
import { addDays } from "./dates";

type Change = { effect: RegisterEffect["kind"]; description: string; apply: () => Promise<void> };

export async function planRegisterChanges(ctx: Ctx, taskId: string): Promise<Change[]> {
  const t = await getTask(ctx, taskId);
  const pb = await getPlaybook(ctx, t.playbookId, t.playbookVersion);
  const cl = (await ctx.db.query.client.findFirst({ where: eq(clientT.id, t.clientId) }))!;
  const person = t.personId ? await ctx.db.query.person.findFirst({ where: (p, { eq }) => eq(p.id, t.personId!) }) : null;
  const v: Record<string, string> = {};
  for (const e of t.checklist) if (e.value) v[e.key] = e.value;
  const eff = t.effectiveDate ?? v.effDate ?? ctx.clock.today();
  const out: Change[] = [];
  for (const e of pb.registerEffects) {
    switch (e.kind) {
      case "appoint_officer": {
        const pid = e.role === "secretary" && ["hk.changeSecretary", "hk.transferIn"].includes(pb.id) ? "per_firm" : person?.id;
        if (!pid) break;
        const name = pid === "per_firm" ? "Caine Road Corporate Services Limited" : person!.nameEn;
        out.push({ effect: e.kind, description: `Appoint ${name} as ${e.role.replace("_", " ")} with effect from ${eff}`, apply: async () => { await appoint(ctx, { clientId: t.clientId, personId: pid, role: e.role as never, fromDate: eff, sourceTaskId: t.id }); } });
        break;
      }
      case "cease_officer": {
        const current = await ctx.db.select().from(appointment).where(and(eq(appointment.clientId, t.clientId), eq(appointment.role, e.role as never), isNull(appointment.toDate)));
        const targets = e.role === "secretary" ? current.filter((a) => a.personId !== "per_firm") : current.filter((a) => a.personId === person?.id);
        const date = v.lastDay ?? eff;
        for (const a of targets) out.push({ effect: e.kind, description: `End ${e.role} appointment (${a.personId === person?.id ? person?.nameEn : a.personId}) on ${date}`, apply: async () => { await ceaseAppointment(ctx, a.id, date, t.id); } });
        break;
      }
      case "change_registered_office": {
        const addr = pb.id === "hk.transferIn" ? "18/F, 88 Caine Road, Mid-Levels, Hong Kong" : v.newAddr;
        if (addr) out.push({ effect: e.kind, description: `Registered office: ${cl.regOfficeEn ?? "—"} → ${addr}`, apply: async () => { await updateClient(ctx, cl.id, { regOfficeEn: addr }, `Task ${t.id}`); } });
        break;
      }
      case "change_name": if (v.newName) out.push({ effect: e.kind, description: `Company name: ${cl.nameEn} → ${v.newName} (effective on the certificate of change of name)`, apply: async () => {
        const zh = v.newName.match(/[㐀-鿿]+[㐀-鿿（）()]*/)?.[0];
        const en = v.newName.match(/[A-Za-z][A-Za-z0-9&.,'()\- ]*Limited/i)?.[0]?.trim() ?? (zh ? cl.nameEn : v.newName);
        await updateClient(ctx, cl.id, { nameEn: en, ...(zh ? { nameTc: zh } : {}) }, `Task ${t.id}`);
      } }); break;
      case "activate_client": out.push({ effect: e.kind, description: `Mark ${cl.nameEn} as an active client`, apply: async () => { await updateClient(ctx, cl.id, { lifecycle: "active" }, `Task ${t.id}`); } }); break;
      case "record_agm": out.push({ effect: e.kind, description: `Record AGM / written resolutions on ${ctx.clock.today()}`, apply: async () => { await updateClient(ctx, cl.id, { jurisdictionData: { ...cl.jurisdictionData, lastAgm: ctx.clock.today() } }, `Task ${t.id}`); } }); break;
      case "renew_br": {
        const br = await ctx.db.query.businessRegistration.findFirst({ where: eq(businessRegistration.clientId, cl.id) });
        if (br?.expiresOn) { const years = Number(v.brTerm?.match(/3/) ? 3 : 1); const next = addDays(br.expiresOn, 365 * years); out.push({ effect: e.kind, description: `Business registration valid until ${next}`, apply: async () => { await ctx.db.update(businessRegistration).set({ expiresOn: next, termYears: years }).where(eq(businessRegistration.id, br.id)); } }); }
        break;
      }
      case "deregister": out.push({ effect: e.kind, description: "Mark the company as deregistering", apply: async () => { await updateClient(ctx, cl.id, { operatingStatus: "deregistering" }, `Task ${t.id}`); } }); break;
      case "change_auditor": if (v.newAuditor) out.push({ effect: e.kind, description: `Auditor: ${cl.auditor ?? "—"} → ${v.newAuditor}`, apply: async () => { await updateClient(ctx, cl.id, { auditor: v.newAuditor }, `Task ${t.id}`); } }); break;
      case "record_annual_return": out.push({ effect: e.kind, description: "Annual return recorded (clears this year's deadline)", apply: async () => {} }); break;
      default: {
        const extra = await import("./register-effects-structured");
        const planned = await extra.planStructured(ctx, t, e, v, eff);
        out.push(...planned);
      }
    }
  }
  return out;
}

export async function applyRegisterChanges(ctx: Ctx, taskId: string) {
  const changes = await planRegisterChanges(ctx, taskId);
  for (const c of changes) await c.apply();
  return changes.map((c) => c.description);
}
