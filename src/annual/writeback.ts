// Writing results back into UHY's own systems (UHY pilot brief, "Principles"): papers into the client
// folders on F: under the firm's naming convention (seed/uhy/filing-rules.json), never overwriting;
// and a status workbook plus review log on the share, regenerated from the database, so staff keep
// the record without the app. The log starts with a byte-order mark so Excel shows Chinese correctly.
import { mkdir, open, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { asc, eq } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { arCase, arCaseEvent, client as clientT } from "@/db/schema";
import { cleanSegment, safeTarget } from "@/mailroom/rules";
import { listCases } from "./cases";

export type UhyFilingRules = { clientFolder: string; annualReturn: string; agm: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const compactDate = (d: string) => `${Number(d.slice(8, 10))}${MONTHS[Number(d.slice(5, 7)) - 1]}${d.slice(0, 4)}`;
const fill = (t: string, v: Record<string, string>) => cleanSegment(t.replace(/\{(\w+)\}/g, (_, k: string) => cleanSegment(v[k] ?? "")));

/** Saves a generated paper in the client's folder; adds " (2)", " (3)"… rather than overwrite anything. */
export async function filePaper(o: { root: string; rules: UhyFilingRules; client: { code: string | null; name: string }; kind: "annualReturn" | "agm"; madeUpDate: string | null; year: number; content: Buffer }): Promise<string> {
  const v = { code: o.client.code ?? "", client: o.client.name, madeUp: o.madeUpDate ? compactDate(o.madeUpDate) : "", year: String(o.year) };
  const folder = fill(o.rules.clientFolder, v);
  const base = fill(o.rules[o.kind], v);
  for (let n = 1; n < 100; n++) {
    const file = `${base}${n > 1 ? ` (${n})` : ""}.pdf`;
    const full = safeTarget(o.root, folder, file);
    await mkdir(path.dirname(full), { recursive: true });
    try { const fh = await open(full, "wx"); await fh.writeFile(o.content); await fh.close(); return full; }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e; }
  }
  throw new Error(`Too many files named ${base} already`);
}

const STAGE_LABEL: Record<string, string> = {
  due: "Due", prepared: "Prepared", payment_confirmed: "Payment confirmed", draft_ready: "Email drafted", sent: "Sent to client",
  signed_received: "Signed copy received", filed: "Filed", registered: "Registered",
};
const STEP_LABEL: Record<string, string> = {
  started_at_stage: "Joined the pilot at this stage", registry_check: "Registry check", prepared: "Papers prepared", form_compare: "Compared with CSA's form",
  payment_confirmed: "Payment confirmed", draft_created: "Email drafted", sent: "Email sent", signed_received: "Signed copy received",
  filed: "Filed", registered: "Registered", gate_defect: "Email linked by hand",
  reply_reviewed: "Client reply reviewed", signed_scan_noted: "Signed scan received by email", change_settled: "Reported change doesn't affect this return", prepared_again: "Return prepared again",
};
const csv = (s: unknown) => { const t = s === null || s === undefined ? "" : String(s); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };

async function atomicWrite(file: string, data: Buffer | string) {
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

/** Regenerates "Clerk annual returns.xlsx" and "Clerk review log.csv" in `dir`. */
export async function writeStatusFiles(ctx: Ctx, dir: string, o: { userNames: Record<string, string> }) {
  await mkdir(dir, { recursive: true });
  const who = (id: string | null | undefined) => (id ? o.userNames[id] ?? (id.startsWith("system:") ? "Clerk" : id) : "");
  const cases = await listCases(ctx);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Cases");
  ws.columns = ["Client code", "Company", "Kind", "Period", "Due", "Stage", "Joined at stage", "Registry check", "Payment confirmed by", "Payment confirmed at", "Email drafted by", "Sent", "Filed", "Registered", "CDD outstanding"]
    .map((h) => ({ header: h, key: h, width: Math.max(12, h.length + 2) }));
  for (const c of cases) ws.addRow([
    c.clientCode ?? "", c.clientName, c.kind === "AR" ? "Annual return" : "AGM", c.periodYear, c.dueDate, STAGE_LABEL[c.stage] ?? c.stage,
    c.startedAtStage ? STAGE_LABEL[c.startedAtStage] : "", c.registryCheck ? (c.registryCheck.result === "no_changes" ? "No changes" : `Changes: ${c.registryCheck.note ?? ""}`) : "",
    who(c.paymentConfirmedBy), c.paymentConfirmedAt?.toISOString() ?? "", who(c.draft?.by), c.sentAt?.toISOString() ?? "", c.filedOn ?? "", c.registeredOn ?? "", c.cddOutstanding ? "Yes" : "",
  ]);
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  await atomicWrite(path.join(dir, "Clerk annual returns.xlsx"), Buffer.from(await wb.xlsx.writeBuffer()));

  const events = await ctx.db.select({ e: arCaseEvent, kind: arCase.kind, year: arCase.periodYear, code: clientT.code, name: clientT.nameEn }).from(arCaseEvent)
    .innerJoin(arCase, eq(arCase.id, arCaseEvent.caseId)).innerJoin(clientT, eq(clientT.id, arCase.clientId))
    .where(eq(arCaseEvent.firmId, ctx.firmId)).orderBy(asc(arCaseEvent.at), asc(arCaseEvent.id));
  const lines = ["When,Who,Client code,Company,Case,Step,Detail", ...events.map((r) => [
    r.e.at.toISOString(), who(r.e.userId), r.code ?? "", r.name, `${r.kind === "AR" ? "Annual return" : "AGM"} ${r.year}`, STEP_LABEL[r.e.kind] ?? r.e.kind,
    Object.entries(r.e.detail).filter(([, v]) => typeof v !== "object").map(([k, v]) => `${k}: ${v}`).join("; "),
  ].map(csv).join(","))];
  await atomicWrite(path.join(dir, "Clerk review log.csv"), "\uFEFF" + lines.join("\n") + "\n");
}
