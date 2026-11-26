// Sets a new password for a staff account on a firm installation: for the fallback account kept
// beside Microsoft 365 sign-in, when its password is forgotten. Signs that account out everywhere.
//   npm run user:password -- --email admin@firm.example
// The password is typed at the prompt, never passed on the command line.
import { createInterface } from "node:readline/promises";
import { and, eq } from "drizzle-orm";
import { makeRuntimeCtx } from "@/lib/runtime";
import { setPassword } from "@/lib/auth";
import { appUser } from "@/db/schema";
import { closePools } from "@/db/client";

const i = process.argv.indexOf("--email");
const email = i > 0 ? process.argv[i + 1]?.trim().toLowerCase() : undefined;
if (!email) { console.error("Usage: --email <email>"); process.exit(2); }
const ctx = makeRuntimeCtx();
const u = await ctx.db.query.appUser.findFirst({ where: and(eq(appUser.firmId, ctx.firmId), eq(appUser.email, email)) });
if (!u) { console.error(`No staff account has the email ${email}.`); await closePools(); process.exit(1); }
const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question(`New password for ${u.name} (12+ characters): `);
rl.close();
await setPassword(ctx, u.id, password);
console.log(`Password set for ${u.name} <${u.email}>. Their earlier sessions are signed out.`);
await closePools();
