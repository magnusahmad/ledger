// Fictional OTP recovery fault; never load configured live providers or .env.
import { makeCtx } from "../helpers";
import { getDb } from "../../src/db/client";
import { requestOtp } from "../../src/domain/signing";
import { FakeMail, type StoredOutbound } from "../../src/integrations/mail/fake";
import { FileList } from "../../src/integrations/json-store";
import { SeqIds } from "../../src/lib/ids";

const url = process.env.DATABASE_URL!;
if (!/^postgres:\/\/localhost\/(?:harbourline_test|harbourline_robust_(?:audit|fixes|verify))$/.test(url)) throw new Error("OTP fault requires an explicitly allowed isolated local database");
const { token, outbox } = JSON.parse(process.argv[2]) as { token: string; outbox: string };
const ctx = makeCtx();
ctx.db = getDb(url);
const ids = new SeqIds();
ctx.ids.next = prefix => `otp_crash_${ids.next(prefix)}`;
ctx.mail = new FakeMail(undefined, undefined, new FileList<StoredOutbound>(outbox));
const accepted = ctx.mail.send.bind(ctx.mail);
ctx.mail.send = async mail => {
  await accepted(mail);
  process.stdout.write("OTP_ACCEPTED_CHECKPOINT\n");
  setInterval(() => {}, 1000);
  return new Promise(() => {});
};
await requestOtp(ctx, token);
