// Resets the CWCCPA mail room demo: its own database (harbourline_cwc), the fictional client
// index, an empty scan folder and draft folder, and a mock "server" with each client's folders.
// Run with the mailroom env (npm run mailroom:reset).
import { Client } from "pg";
import { readFileSync, existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { runMigrations } from "@/db/migrate";
import { closePools } from "@/db/client";
import { firm, mailroomBatch, mailroomLetter } from "@/db/schema";
import { makeRuntimeCtx } from "@/lib/runtime";
import { makeMailroom, MAILROOM_ROOT } from "@/mailroom/runtime";
import { importClients } from "@/mailroom/service";

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const name = url.pathname.slice(1);
  if (!/^harbourline_cwc/.test(name)) throw new Error(`Refusing to reset ${name}: the mail room demo uses its own database (harbourline_cwc).`);
  const admin = new Client({ connectionString: Object.assign(new URL(url), { pathname: "/postgres" }).toString() });
  await admin.connect();
  const exists = await admin.query("select 1 from pg_database where datname = $1", [name]);
  if (!exists.rowCount) await admin.query(`create database "${name}"`);
  await admin.end();
  await runMigrations(url.toString());

  const ctx = makeRuntimeCtx();
  await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: "CWC CPA Limited", invoicePrefix: "CWC" }).onConflictDoNothing();
  await ctx.db.delete(mailroomLetter).where(eq(mailroomLetter.firmId, ctx.firmId));
  await ctx.db.delete(mailroomBatch).where(eq(mailroomBatch.firmId, ctx.firmId));
  const csv = readFileSync(path.join(process.cwd(), "seed/mailroom/cwccpa-demo-clients.csv"), "utf8");
  const n = await importClients(ctx, csv);

  const mr = makeMailroom(ctx);
  await rm(MAILROOM_ROOT, { recursive: true, force: true });
  for (const d of [mr.scanDir, mr.serverRoot]) await mkdir(d, { recursive: true });
  // A server that looks lived in: each client's usual folders and a few of last year's letters.
  const rows = csv.trim().split("\n").slice(1).map((l) => l.split(",")[6]);
  for (const folder of rows) for (const sub of ["Tax/2024-25", "Tax/2025-26", "Company secretarial", "Bank", "Correspondence"]) await mkdir(path.join(mr.serverRoot, "Clients", folder, sub), { recursive: true });
  await mkdir(path.join(mr.serverRoot, "_Unsorted"), { recursive: true });
  const old = path.join(mr.serverRoot, "Clients", "ABC Trading Limited", "Tax", "2024-25", "2025-10-28 IRD demand note 2024-25.pdf");
  if (!existsSync(old)) await writeFile(old, readFileSync(path.join(process.cwd(), "demos/cwccpa/letter-pack.pdf")));
  console.log(`Mail room demo reset: ${n} clients. Scans: ${mr.scanDir}  Server: ${mr.serverRoot}`);
  await closePools();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
