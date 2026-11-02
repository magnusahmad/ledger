// Resets the CWCCPA mail room demo: its own database (harbourline_cwc), the fictional client
// index, an empty scan folder and draft folder, and a mock "server" with each client's folders.
// Run with the mailroom env (npm run mailroom:reset).
import { Client } from "pg";
import { readFileSync, existsSync } from "node:fs";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { runMigrations } from "@/db/migrate";
import { closePools } from "@/db/client";
import { firm, kv, mailroomBatch, mailroomClient, mailroomLetter } from "@/db/schema";
import { makeRuntimeCtx } from "@/lib/runtime";
import { makeMailroom, MAILROOM_ROOT } from "@/mailroom/runtime";
import { clients } from "@/mailroom/service";
import { csvRows, CSV_COLUMNS, syncClients } from "@/mailroom/client-sync";

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
  const mr = makeMailroom(ctx);
  await rm(MAILROOM_ROOT, { recursive: true, force: true });
  for (const d of [mr.scanDir, mr.serverRoot]) await mkdir(d, { recursive: true });
  await ctx.db.delete(kv).where(and(eq(kv.firmId, ctx.firmId), eq(kv.key, "mailroom.clientSync")));
  // A mock X: drive laid out like CWCCPA's: the client folders, and its Excel client list under Admin.
  const csv = readFileSync(path.join(process.cwd(), "seed/mailroom/cwccpa-demo-clients.csv"), "utf8");
  const base = path.join(mr.serverRoot, "CWCHK Client Folder");
  for (const c of csvRows(csv, CSV_COLUMNS)) await mkdir(path.join(base, `${c.code}-${c.name}`, `${c.code}-Tax Folder`), { recursive: true });
  await mkdir(path.join(mr.serverRoot, "Admin"), { recursive: true });
  await copyFile(path.join(process.cwd(), "seed/mailroom/cwccpa-demo-clients.xlsx"), path.join(mr.serverRoot, "Admin", "CWC client list.xlsx"));
  await mkdir(path.join(mr.serverRoot, mr.rules.unsortedFolder), { recursive: true });
  await ctx.db.delete(mailroomClient).where(eq(mailroomClient.firmId, ctx.firmId));
  const sync = await syncClients(ctx, mr, mr.clientSources ?? []);
  if (sync.error) throw new Error(sync.error);
  const n = sync.added ?? 0;
  const abc = (await clients(ctx)).find((c) => c.name === "ABC Trading Limited");
  const old = abc && path.join(base, abc.folder, `${abc.code}-Tax Folder`, "2025-10-28 IRD demand note 2024-25.pdf");
  if (old && !existsSync(old)) await writeFile(old, readFileSync(path.join(process.cwd(), "demos/cwccpa/letter-pack.pdf")));
  console.log(`Mail room demo reset: ${n} clients. Scans: ${mr.scanDir}  Server: ${mr.serverRoot}`);
  await closePools();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
