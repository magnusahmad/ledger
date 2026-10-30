// End of a batch: what was filed, how long checking took, and undo for any filing.
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { getMailroom } from "@/server/mailroom";
import { undoAction } from "@/server/mailroom-actions";
import { lettersFor } from "@/mailroom/service";
import { ruleFor } from "@/mailroom/rules";

export default async function BatchDone({ params }: { params: Promise<{ batch: string }> }) {
  const { batch } = await params;
  const { ctx, mr } = getMailroom();
  const letters = await lettersFor(ctx, batch);
  const filed = letters.filter((l) => l.status === "approved");
  const left = letters.filter((l) => l.status === "proposed");
  const drafts = filed.filter((l) => l.draftRef).length;
  const timed = filed.filter((l) => l.reviewMs !== null);
  const avg = timed.length ? Math.round(timed.reduce((s, l) => s + l.reviewMs!, 0) / timed.length / 1000) : null;
  return (
    <div className="mr-narrow">
      <Link className="back" href="/mailroom">‹ Today</Link>
      <h1>{left.length ? `${filed.length} of ${letters.length} letters filed` : `All ${letters.length} letters filed`}</h1>
      <p className="sub">{drafts} {drafts === 1 ? "email is" : "emails are"} waiting in your drafts. Nothing has been sent.</p>
      <div className="mr-stats">
        <div><div className="mr-big">{filed.length}</div><span className="small muted">filed</span></div>
        {avg !== null && <div><div className="mr-big">{avg}s</div><span className="small muted">to check each letter</span></div>}
      </div>
      {left.length > 0 && <p style={{ marginTop: 24 }}><Link className="btn" href={`/mailroom/${batch}?l=${left[0].id}`}>Check the rest</Link></p>}
      <div className="mr-done-list">
        {filed.map((l) => (
          <div key={l.id} className="mr-done-row">
            <div><b>{l.client?.name ?? (l.matchReason === "not a client" ? `Not a client: ${l.read?.addressee ?? ""}` : "Junk")}</b><div className="small muted">{l.read ? ruleFor(mr.rules, l.read.type).label : ""}</div></div>
            <ActionForm action={undoAction} submit="Undo" tone="secondary"><input type="hidden" name="letterId" value={l.id} /></ActionForm>
          </div>
        ))}
      </div>
    </div>
  );
}
