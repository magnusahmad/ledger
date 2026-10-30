// The mail room's folders, rules and draft box for this installation (from the environment).
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Ctx } from "@/lib/ctx";
import { STORAGE_ROOT } from "@/lib/runtime";
import { EmlDraftBox, GmailDraftBox } from "./drafts";
import type { FilingRules } from "./rules";
import type { Mailroom } from "./service";

export const MAILROOM_ROOT = path.join(STORAGE_ROOT, "mailroom");

export function makeMailroom(ctx: Ctx): Mailroom {
  const c = ctx.config;
  const rules = JSON.parse(readFileSync(path.resolve(c.MAILROOM_RULES), "utf8")) as FilingRules;
  const mail = ctx.mail;
  const drafts = c.MAILROOM_DRAFTS === "gmail" && mail.createDraft && mail.deleteDraft
    ? new GmailDraftBox({ createDraft: (m) => mail.createDraft!(m), deleteDraft: (id) => mail.deleteDraft!(id) })
    : new EmlDraftBox(path.resolve(c.MAILROOM_DRAFTS_DIR ?? path.join(MAILROOM_ROOT, "Outlook drafts")), c.MAILROOM_FROM);
  return {
    drafts, rules, fromAddress: c.MAILROOM_FROM, firmName: c.MAILROOM_FIRM_NAME,
    scanDir: path.resolve(c.MAILROOM_SCAN_DIR ?? path.join(MAILROOM_ROOT, "Scans")),
    serverRoot: path.resolve(c.MAILROOM_SERVER_DIR ?? path.join(MAILROOM_ROOT, "Server")),
  };
}
