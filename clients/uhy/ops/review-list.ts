// UHY pilot: write the list of companies for staff to check (clients/uhy/src/review.ts) to a file on
// the pilot machine. Run after
//   . C:\Clerk\deploy\clerk-env.ps1
//   node node_modules\tsx\dist\cli.mjs clients\uhy\ops\review-list.ts [--out C:\Clerk\private\review-list.txt]
// The file holds company names, so only the counts are printed here.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { makeRuntimeCtx } from "@/lib/runtime";
import { closePools } from "@/db/client";
import { arCase, client } from "@/db/schema";
import { readClientListReport } from "@/annual/client-list";
import { readHealth } from "@/annual/cycle";
import { reviewMessage } from "../src/review";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const out = arg("out") ?? path.join("private", "review-list.txt");
const ctx = makeRuntimeCtx();
const today = ctx.clock.today();
const clients = await ctx.db.select().from(client).where(eq(client.firmId, ctx.firmId));
const byId = new Map(clients.map((c) => [c.id, c]));
const cases = await ctx.db.select().from(arCase).where(eq(arCase.firmId, ctx.firmId));
const report = await readClientListReport(ctx);
const overdue = cases.filter((k) => k.kind === "AR" && k.dueDate < today && k.stage !== "registered" && k.stage !== "filed").map((k) => {
  const c = byId.get(k.clientId)!;
  return { code: c.code, nameEn: c.nameEn, periodYear: k.periodYear, dueDate: k.dueDate, lastReturnOn: (c.jurisdictionData as { lastAnnualReturnOn?: string | null }).lastAnnualReturnOn ?? null };
});
const suffixes: Record<string, number> = {};
for (const c of clients) { const m = /^[A-Z]\d{3,4}([A-Z]{1,2})$/.exec((c.code ?? "").toUpperCase()); if (m) suffixes[m[1]] = (suffixes[m[1]] ?? 0) + 1; }
const text = reviewMessage({ asAt: today, recordsAsAt: (await readHealth(ctx))?.recordsAsAt?.slice(0, 10) ?? null, differences: report?.differences ?? [], overdue, problems: report?.problems ?? [], suffixes });
await mkdir(path.dirname(path.resolve(out)), { recursive: true });
// With a byte-order mark, so Notepad on Windows shows Chinese names correctly.
await writeFile(out, `\uFEFF${text.replace(/\n/g, "\r\n")}`, "utf8");
console.log(`Written to ${path.resolve(out)}: ${overdue.length} overdue returns, ${(report?.differences ?? []).filter((d) => d.kind !== "notInRecords").length} differences, ${report?.problems.length ?? 0} unread rows.`);
await closePools();
