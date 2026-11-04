// Creates a staff account for a firm installation (no self-registration).
//   npm run user:add -- --email ruby@uhy.example --name Ruby --initials RL --role staff
// The password is typed at the prompt, never passed on the command line.
import { createInterface } from "node:readline/promises";
import { makeRuntimeCtx } from "@/lib/runtime";
import { createStaffUser, type Role } from "@/lib/auth";
import { closePools } from "@/db/client";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const email = arg("email"), name = arg("name"), initials = arg("initials"), role = (arg("role") ?? "staff") as Role;
if (!email || !name || !initials || !["staff", "approver", "admin"].includes(role)) { console.error("Usage: --email <email> --name <name> --initials <XX> [--role staff|approver|admin]"); process.exit(1); }
const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question("Password (12+ characters): ");
rl.close();
const ctx = makeRuntimeCtx();
const u = await createStaffUser(ctx, { email, name, initials, password, role });
console.log(`Created ${u.name} <${u.email}> as ${u.role} (${u.id}).`);
await closePools();
