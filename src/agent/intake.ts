import type { Ctx } from "@/lib/ctx";
import { callAgent } from "./call";
import { IntakeZ, type Intake } from "./schemas";
import { INTAKE_SYSTEM } from "./prompts";
import { clientSnapshot, playbookCatalogue, type Snapshot } from "./context";

export type IntakeInput = {
  messageId: string;
  from: { email: string | null; name: string | null };
  subject: string | null;
  text: string;
  attachments: { filename: string; mime: string | null; textPreview?: string | null }[];
  candidateClientIds: string[];
  threadHistory?: { direction: string; text: string }[];
};

export async function runIntake(ctx: Ctx, input: IntakeInput): Promise<{ intake: Intake; snapshots: Snapshot[] }> {
  const snapshots = (await Promise.all(input.candidateClientIds.map((id) => clientSnapshot(ctx, id)))).filter((s): s is Snapshot => !!s);
  const jurisdictions = [...new Set(["HK", ...snapshots.map((s) => s.jurisdiction)])];
  const catalogue = await playbookCatalogue(ctx, jurisdictions);
  const user = [
    `Today's date in Hong Kong: ${ctx.clock.today()}.`,
    `Sender: ${input.from.name ?? ""} <${input.from.email ?? "unknown"}>`,
    snapshots.length
      ? `The sender is linked to ${snapshots.length} client(s). Client snapshots:\n${JSON.stringify(snapshots, null, 1)}`
      : "The sender is not linked to any existing client.",
    `Playbook catalogue:\n${JSON.stringify(catalogue)}`,
    input.threadHistory?.length ? `Earlier messages in this thread (oldest first):\n${input.threadHistory.map((m) => `[${m.direction}] ${m.text.slice(0, 800)}`).join("\n---\n")}` : "",
    `NEW MESSAGE\nSubject: ${input.subject ?? ""}\n\n${input.text}`,
    input.attachments.length ? `Attachments:\n${input.attachments.map((a) => `- ${a.filename} (${a.mime ?? "unknown"})${a.textPreview ? `: ${a.textPreview.slice(0, 500)}` : ""}`).join("\n")}` : "No attachments.",
  ].filter(Boolean).join("\n\n");
  const intake = await callAgent(ctx, { agent: "intake", system: INTAKE_SYSTEM, user, schema: IntakeZ, messageId: input.messageId });
  return { intake, snapshots };
}
