// Fault fixture: stop after a real durable checkpoint, then let the parent SIGKILL us.
// Never loads .env or a runtime context with configured external providers.
import { makeCtx } from "../helpers";
import { getDb } from "../../src/db/client";
import { approveProposal, onApprove } from "../../src/domain/proposals";
import { onJob, runJobs } from "../../src/domain/jobs";
import { matchDeposit } from "../../src/domain/payments";
import { ingestMessage } from "../../src/domain/inbound";
import { job } from "../../src/db/schema";
import { FakeMail, type StoredOutbound } from "../../src/integrations/mail/fake";
import { FileList } from "../../src/integrations/json-store";
import type { Ctx } from "../../src/lib/ctx";
import { SeqIds } from "../../src/lib/ids";

const url = process.env.DATABASE_URL!;
if (!/^postgres:\/\/localhost\/(?:clerk_test|clerk_robust_(?:audit|fixes|verify))$/.test(url)) throw new Error("Crash fixture requires an explicitly allowed isolated local test database");
const ctx = makeCtx();
ctx.db = getDb(url);
// A restarted process must not restart the parent's deterministic audit ID sequence.
const childIds = new SeqIds();
ctx.ids.next = prefix => `crash_${childIds.next(prefix)}`;
ctx.ids.token = () => childIds.token();
const checkpoint = async (): Promise<never> => {
  process.stdout.write("RECOVERY_CHECKPOINT\n");
  setInterval(() => {}, 1000);
  return new Promise(() => {});
};
const mode = process.argv[2];
if (mode === "approval") {
  onApprove("send_message", checkpoint);
  await approveProposal(ctx, process.argv[3], { edits: { text: "Human approved recovery wording" } });
} else if (mode === "job") {
  onJob("xero.sync_invoice", checkpoint);
  await runJobs(ctx);
} else if (mode === "bank") {
  // matchDeposit writes bank_transaction before its first invoice query.
  ctx.db = new Proxy(ctx.db, { get(db, key) {
    if (key === "select") return () => ({ from: () => ({ where: checkpoint }) });
    return Reflect.get(db, key);
  } });
  const d = JSON.parse(process.argv[3]);
  await matchDeposit(ctx, { ...d, receivedAt: new Date(d.receivedAt) });
} else if (mode === "inbound") {
  const m = JSON.parse(process.argv[3]);
  await ingestMessage(ctx, { ...m, channel: "email", receivedAt: new Date(m.receivedAt) });
  await checkpoint();
} else if (mode === "finalization") {
  const input = JSON.parse(process.argv[3]) as { proposalId: string; outbox: string };
  ctx.mail = new FakeMail(undefined, undefined, new FileList<StoredOutbound>(input.outbox));
  // Intercept the real first invoice-sync enqueue, including inside a transaction.
  // The old handler commits invoice/job separately; the repaired handler rolls local
  // finalization back on death while retaining its accepted delivery journal.
  const wrap = (db: Ctx["db"]): Ctx["db"] => new Proxy(db, { get(target, key) {
    if (key === "transaction") return (fn: (tx: Ctx["db"]) => Promise<unknown>) => target.transaction(tx => fn(wrap(tx as unknown as Ctx["db"])));
    if (key === "insert") return (table: Parameters<typeof target.insert>[0]) => {
      if (table !== job) return target.insert(table);
      return { values(value: typeof job.$inferInsert) {
        const insert = target.insert(job).values(value);
        return { async onConflictDoNothing() { await insert.onConflictDoNothing(); await checkpoint(); } };
      } };
    };
    return Reflect.get(target, key);
  } });
  ctx.db = wrap(ctx.db);
  await approveProposal(ctx, input.proposalId);
} else throw new Error("Unknown crash mode");
