// Creates the firm record for a new installation (idempotent) and loads the playbook library.
//   npm run firm:init -- --name "UHY-ASK ..." --address "..." --email cosec@... --phone "..."
import { eq } from "drizzle-orm";
import { makeRuntimeCtx } from "@/lib/runtime";
import { firm } from "@/db/schema";
import { loadPlaybookLibrary } from "@/domain/playbooks";
import { closePools } from "@/db/client";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const ctx = makeRuntimeCtx();
const name = arg("name");
const existing = await ctx.db.query.firm.findFirst({ where: eq(firm.id, ctx.firmId) });
if (!existing) {
  if (!name) { console.error("Usage: --name <legal name> --address <address> --email <email> --phone <phone>"); process.exit(1); }
  await ctx.db.insert(firm).values({ id: ctx.firmId, legalName: name, address: arg("address") ?? null, email: arg("email") ?? null, phone: arg("phone") ?? null, invoicePrefix: "P" });
  console.log(`Created firm ${ctx.firmId}: ${name}`);
} else console.log(`Firm ${ctx.firmId} already exists: ${existing.legalName}`);
await loadPlaybookLibrary(ctx);
console.log("Playbooks loaded.");
await closePools();
