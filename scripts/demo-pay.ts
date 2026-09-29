// npm run demo:pay <invoice number> — simulate the client paying (Airwallex sandbox deposit when configured).
import { eq } from "drizzle-orm";
import { makeRuntimeCtx } from "@/lib/runtime";
import { invoice } from "@/db/schema";
import { pollBank } from "@/domain/payments";
import { runJobs } from "@/domain/jobs";
import { closePools } from "@/db/client";
import "@/domain/inbound";
const ctx = makeRuntimeCtx();
const number = process.argv[2];
const inv = await ctx.db.query.invoice.findFirst({ where: eq(invoice.number, number) });
if (!inv) throw new Error(`No invoice ${number}`);
await ctx.bank.simulateDeposit!({ amountCents: inv.totalCents - inv.paidCents, currency: inv.currency, reference: inv.number, payerName: "Demo client" });
console.log(await pollBank(ctx));
await runJobs(ctx);
await closePools();
