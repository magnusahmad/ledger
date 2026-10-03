import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { makeCtx, resetDb, TEST_DB, type TestCtx } from "./helpers";
import { seedDemo } from "@/db/seed-demo";
import { createRequest, startTask } from "@/domain/engine";
import { openSigning, requestOtp, verifyOtp } from "@/domain/signing";
import { mailDelivery, signer, signEnvelope } from "@/db/schema";
import { Crypto } from "@/lib/crypto";
import { FakeMail, type StoredOutbound } from "@/integrations/mail/fake";
import { FileList } from "@/integrations/json-store";

let ctx: TestCtx;
beforeEach(async () => { await resetDb(); ctx = makeCtx(); await seedDemo(ctx, { demoEmail: "director@kbtrading.example" }); });

async function link() {
  const req = await createRequest(ctx, { clientId: "cli_c1" });
  const task = await startTask(ctx, { requestId: req.id, clientId: "cli_c1", playbookId: "hk.changeOffice" });
  const [env] = await ctx.db.insert(signEnvelope).values({ id: ctx.ids.next("env"), firmId: ctx.firmId, taskId: task.id, status: "sent", documentIds: [] }).returning();
  const token = ctx.ids.token();
  const [row] = await ctx.db.insert(signer).values({ id: ctx.ids.next("sgn"), firmId: ctx.firmId, envelopeId: env.id, name: "Fictional recipient 測試", email: "director@kbtrading.example", tokenHash: Crypto.sha256(token) }).returning();
  return { token, row };
}
function deliveredCode() {
  const code = ctx.mail.sent().at(-1)?.text.match(/\b\d{6}\b/)?.[0];
  if (!code) throw new Error("Fictional mailbox has no delivered code");
  return code;
}
async function killAfterAcceptance(token: string, outbox: string) {
  const child = spawn(process.execPath, ["--import", "tsx", "tests/fixtures/otp-crash-worker.ts", JSON.stringify({ token, outbox })], {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: TEST_DB, LLM_MODE: "fixture", MAIL_PROVIDER: "fake" }, stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("OTP acceptance checkpoint was not reached")), 15_000);
      child.stdout.on("data", chunk => { if (String(chunk).includes("OTP_ACCEPTED_CHECKPOINT")) { clearTimeout(timer); resolve(); } });
      child.stderr.on("data", () => {}); // Never include a provider body or secret in failure output.
      child.once("exit", () => { clearTimeout(timer); reject(new Error("OTP fault process exited before its acceptance checkpoint")); });
      child.once("error", () => { clearTimeout(timer); reject(new Error("OTP fault process could not start")); });
    });
  } finally {
    if (child.exitCode === null && child.signalCode === null) { const exited = once(child, "exit"); child.kill("SIGKILL"); await exited; }
  }
  expect(child.signalCode).toBe("SIGKILL");
}

it("OTP delivery journals encrypt the code and public signing views expose no challenge secrets", async () => {
  const { token, row } = await link();
  await requestOtp(ctx, token);
  const code = deliveredCode();
  const journals = await ctx.db.select().from(mailDelivery);
  expect(journals).toHaveLength(1);
  expect(journals[0].sourceKey.startsWith(`otp:${row.id}:`)).toBe(true);
  expect(journals[0].payload.startsWith("v1.")).toBe(true);
  const decrypted = ctx.crypto.decrypt(journals[0].payload);
  expect(Crypto.sha256(decrypted) === journals[0].payloadHash).toBe(true);
  expect((JSON.parse(decrypted) as { text: string }).text.includes(code)).toBe(true);
  const view = JSON.stringify(await openSigning(ctx, token));
  expect(view.includes(code)).toBe(false);
  expect(view.includes(token)).toBe(false);
  expect(view.includes("otpHash")).toBe(false);
  expect(view.includes("tokenHash")).toBe(false);
});

it("killing OTP delivery after provider acceptance releases its session locks and preserves one usable delivered challenge", async () => {
  const folder = await mkdtemp(join(tmpdir(), "harbourline-otp-crash-"));
  try {
    const outbox = join(folder, "fictional-outbox.json");
    ctx.mail = new FakeMail(undefined, undefined, new FileList<StoredOutbound>(outbox));
    const { token, row } = await link();
    await killAfterAcceptance(token, outbox);
    expect(ctx.mail.sent()).toHaveLength(1);
    const code = deliveredCode();
    const saved = (await ctx.db.query.signer.findFirst({ where: eq(signer.id, row.id) }))!;
    expect(saved.otpHash === Crypto.sha256(`${row.id}:${code}`)).toBe(true);
    expect(saved.otpExpiresAt?.getTime()).toBe(ctx.clock.operationalNow().getTime() + 600_000);
    ctx.clock.advanceSeconds(599);
    await verifyOtp(ctx, token, code);
    expect((await openSigning(ctx, token)).signer.otpVerified).toBe(true);
    await expect(verifyOtp(ctx, token, code)).rejects.toThrow(/request|used|verified/i);
    expect(ctx.mail.sent()).toHaveLength(1);
  } finally { await rm(folder, { recursive: true, force: true }); }
}, 25_000);
