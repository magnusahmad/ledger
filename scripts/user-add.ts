// Creates a staff account for a firm installation (no self-registration).
//   npm run user:add -- --email ruby@firm.example --name Ruby --initials RL --role staff
// With Microsoft 365 sign-in the account needs no password. Add --password for the one fallback
// account: the password is then typed at the prompt, never passed on the command line.
import { createInterface } from "node:readline/promises";
import { makeRuntimeCtx } from "@/lib/runtime";
import { createStaffUser, type Role } from "@/lib/auth";
import { closePools } from "@/db/client";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const email = arg("email"), name = arg("name"), initials = arg("initials"), role = (arg("role") ?? "staff") as Role;
if (!email || !name || !initials || !["staff", "approver", "admin"].includes(role)) { console.error("Usage: --email <email> --name <name> --initials <XX> [--role staff|approver|admin]"); process.exit(1); }
const ctx = makeRuntimeCtx();
// Without Microsoft sign-in a password is the only way in, so it is always asked for.
let password: string | undefined;
if (process.argv.includes("--password") || ctx.config.SSO !== "microsoft") {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("Password (12+ characters): ");
  rl.close();
}
const u = await createStaffUser(ctx, { email, name, initials, password, role });
console.log(`Created ${u.name} <${u.email}> as ${u.role} (${u.id})${password === undefined ? ", signing in with Microsoft 365" : ""}.`);
await closePools();
