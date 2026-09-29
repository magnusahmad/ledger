type Proposal = { kind: string; requestId?: string | null; title: string; summary?: string | null; payload: Record<string, unknown> };
export async function approveCurrentRehearsalProposal(approve: () => Promise<void>, isSuperseded: () => Promise<boolean>) {
  try { await approve(); return true; }
  catch (error) {
    if (await isSuperseded()) return false;
    throw error;
  }
}
export function requireRehearsalRequest(proposals: Proposal[], model: string): string {
  const requestId = proposals.find(p => p.kind === "send_message" && p.requestId)?.requestId;
  if (requestId) return requestId;
  const reasons = proposals.filter(p => p.kind === "triage").map(p => String(p.payload.reason ?? p.summary ?? p.title));
  const reason = reasons.join("; ") || "No reply with a request was created. Inspect the scratch database's proposals and LLM call log.";
  const hint = /not available in your region/i.test(reason)
    ? ` Set LLM_MODEL to a model available to your OpenRouter account and region, then rerun. The configured model was ${model}.`
    : "";
  throw new Error(`Intake did not create a request: ${reason}${hint}`);
}
export function assertRehearsalComplete(tasks: { title: string; status: string }[], pending: { title: string }[]) {
  if (!tasks.length) throw new Error("Rehearsal incomplete: no tasks were created.");
  const unfinished = tasks.filter(t => t.status !== "done");
  if (unfinished.length || pending.length) throw new Error(`Rehearsal incomplete: ${[...unfinished.map(t => `${t.title} (${t.status})`), ...pending.map(p => `pending: ${p.title}`)].join("; ")}`);
}
export async function runRehearsal(work: () => Promise<void>, close: () => Promise<void>, report: (message: string) => void) {
  try { await work(); return 0; }
  catch (error) { report(`Rehearsal failed: ${error instanceof Error ? error.message : String(error)}`); return 1; }
  finally { await close(); }
}
