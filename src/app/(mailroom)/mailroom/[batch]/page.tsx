// Reviewing one letter at a time: who it's for, what it is, then approve. Filing path and the
// client email sit one step away, and editing them one step further.
import Link from "next/link";
import { redirect } from "next/navigation";
import { LiveRefresh } from "@/components/LiveRefresh";
import { ActionForm } from "@/components/ActionForm";
import { DeadlineStamp } from "@/components/ui";
import { getMailroom } from "@/server/mailroom";
import { approveAction, chooseClientAction, editAction, notForAClientAction, undoAction } from "@/server/mailroom-actions";
import { clients, lettersFor, openLetter, type Letter, type MailroomClient } from "@/mailroom/service";
import { ruleFor, type FilingRules } from "@/mailroom/rules";
import { filingLine } from "@/mailroom/review";
import { ReviewShell, ScanView } from "../ui";

type Search = { l?: string; change?: string; edit?: string };

type Display = FilingRules["display"];

export default async function ReviewLetter({ params, searchParams }: { params: Promise<{ batch: string }>; searchParams: Promise<Search> }) {
  const { batch } = await params;
  const q = await searchParams;
  const { ctx, mr } = getMailroom();
  const letters = await lettersFor(ctx, batch);
  const letter = q.l ? letters.find((l) => l.id === q.l) : letters.find((l) => l.status === "proposed");
  if (!letter) {
    if (letters.length && letters.every((l) => l.status === "approved" || l.status === "failed")) redirect(`/mailroom/${batch}/done`);
    return (
      <div className="mr-narrow">
        <LiveRefresh src="/api/mailroom/live" intervalMs={1500} />
        <Link className="back" href="/mailroom">‹ Today</Link>
        <h1>Reading the scan…</h1>
        <p className="sub">{letters.length ? `${letters.filter((l) => l.status !== "reading").length} of ${letters.length} letters read. The first will open here.` : "Finding where each letter starts."}</p>
      </div>
    );
  }
  if (letter.status === "proposed") await openLetter(ctx, letter.id);
  const done = letters.filter((l) => l.status === "approved").length;
  const all = await clients(ctx);
  const rule = letter.read ? ruleFor(mr.rules, letter.read.type) : null;
  const today = ctx.clock.today();
  const i = letters.indexOf(letter);
  const href = (l?: Letter) => (l ? `/mailroom/${batch}?l=${l.id}` : null);
  const base = `/mailroom/${batch}?l=${letter.id}`;
  // The bar replaces the panel in focus mode only for a plain decision; anything that
  // needs more room (choosing a client, editing, a filed letter) keeps the panel.
  const plain = letter.status === "proposed" && letter.matchKind !== "ask" && !q.change && !q.edit;
  const panel = letter.status === "reading" ? <p className="sub">Reading this letter…</p>
    : letter.status === "failed" ? <Failed letter={letter} />
    : letter.status === "approved" ? <Filed letter={letter} display={mr.rules.display} />
    : letter.matchKind === "ask" || q.change ? <WhoseLetter letter={letter} all={all} />
    : <Proposal letter={letter} label={rule?.label ?? "Letter"} today={today} edit={!!q.edit} display={mr.rules.display} />;
  return (
    <ReviewShell prevHref={href(letters[i - 1])} nextHref={href(letters[i + 1])} changeHref={plain ? `${base}&edit=1` : null} hasBar={plain}
      list={<LetterList letters={letters} current={letter.id} done={done} today={today} />}
      scan={<ScanView key={letter.id} src={`/api/mailroom/letters/${letter.id}`} />}
      bar={plain ? <Bar letter={letter} label={rule?.label ?? "Letter"} today={today} display={mr.rules.display} /> : null}
      panel={<>
        <LiveRefresh src="/api/mailroom/live" intervalMs={3000} />
        <div className="mr-count"><Link href="/mailroom">‹ Today</Link><span>Letter {letter.seq} of {letters.length}</span></div>
        {panel}
        <a className="mr-link mr-scan-link" href={`/api/mailroom/letters/${letter.id}`} target="_blank">View scan</a>
        <p className="mr-keys">↵ approve · C change · J / K next and previous · [ hide the list</p>
      </>} />
  );
}

function LetterList({ letters, current, done, today }: { letters: Letter[]; current: string; done: number; today: string }) {
  const asking = letters.filter((l) => l.status === "proposed" && l.matchKind === "ask").length;
  return (
    <>
      <div className="mr-list-head"><b>This morning&apos;s scan</b><span>{letters.length} letters · {done} filed{asking ? ` · ${asking} need${asking === 1 ? "s" : ""} you` : ""}</span></div>
      {letters.map((l) => {
        const name = l.client?.name ?? (l.status === "reading" ? "Reading…" : l.matchKind === "ask" ? "Whose letter?" : l.matchReason === "not a client" ? "Not a client" : l.matchKind === "junk" ? "Junk" : "Letter");
        const due = l.read?.dueDate ? Math.round((new Date(l.read.dueDate + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86400000) : null;
        const mark = l.status === "approved" ? <span className="ok">Filed</span> : l.status === "failed" ? <span className="red">Unread</span>
          : l.matchKind === "ask" ? <span className="amber">Needs you</span> : due !== null && due <= 30 ? <span className="red">{due < 0 ? "逾" : "限"}</span> : null;
        return (
          <Link key={l.id} href={`/mailroom/${l.batchId}?l=${l.id}`} className={`mr-item${l.id === current ? " on" : ""}${l.status === "approved" ? " done" : ""}`} aria-current={l.id === current ? "page" : undefined}>
            <span><b>{name}</b><small>{l.read ? (l.read.sender) : ""}</small></span>{mark}
          </Link>
        );
      })}
    </>
  );
}

function Bar({ letter, label, today, display }: { letter: Letter; label: string; today: string; display?: Display }) {
  const r = letter.read!;
  const junk = letter.matchKind === "junk";
  const notClient = letter.matchReason === "not a client";
  const where = filingLine(letter.folder, letter.fileName, display);
  return (
    <div className="mr-bar-dock">
      <div className="mr-bar-main">
        <b>{notClient ? "Not for any client" : junk ? "Advertising or junk mail" : letter.client?.name}</b>
        <span className="mr-bar-path">{where.path}{display?.separator ?? " › "}<span className="muted">{where.file}</span></span>
        <span className="small muted">{[label, r.actionNeeded, letter.emailTo && `email to ${letter.client?.contactName ?? letter.emailTo}`].filter(Boolean).join(" · ")}</span>
      </div>
      {!junk && <DeadlineStamp dueDate={r.dueDate} today={today} nearOnly />}
      <Link className="btn sec2" href={`/mailroom/${letter.batchId}?l=${letter.id}&edit=1`}>Change <kbd>C</kbd></Link>
      <div data-approve><ActionForm action={approveAction} submit={<>{notClient ? "File as unsorted" : junk ? "File as junk" : "Approve and file"} <kbd>↵</kbd></>}><input type="hidden" name="letterId" value={letter.id} /></ActionForm></div>
    </div>
  );
}

function Proposal({ letter, label, today, edit, display }: { letter: Letter; label: string; today: string; edit: boolean; display?: Display }) {
  const r = letter.read!;
  const junk = letter.matchKind === "junk";
  const notClient = letter.matchReason === "not a client";
  const base = `/mailroom/${letter.batchId}?l=${letter.id}`;
  const where = filingLine(letter.folder, letter.fileName, display);
  return (
    <>
      <h1>{notClient ? "Not for any client" : junk ? "Advertising or junk mail" : letter.client?.name}</h1>
      {!junk && letter.client?.nameZh && <div className="mr-zh">{letter.client.nameZh}</div>}
      <p className="mr-what">{notClient ? `${label}, from ${r.sender}, addressed to ${r.addressee}` : junk ? `From ${r.sender}` : `${label}, from ${r.sender}`}</p>
      {!junk && <div className="mr-action">{r.actionNeeded ?? "Nothing for the client to do."} <DeadlineStamp dueDate={r.dueDate} today={today} nearOnly /></div>}
      {!junk && letter.matchReason && <p className="mr-why">{letter.matchReason === "chosen by staff" ? "You chose this client" : `Matched on ${letter.matchReason}`}</p>}
      <div className="mr-files"><span>Files to</span><b>{where.path}</b><span>{where.file}</span></div>
      <div className="mr-actions" data-approve>
        <ActionForm action={approveAction} submit={notClient ? "File as unsorted" : junk ? "File as junk" : "Approve and file"}><input type="hidden" name="letterId" value={letter.id} /></ActionForm>
        {!junk && <Link className="mr-link" href={`${base}&change=client`}>Not this client</Link>}
      </div>
      <details key={letter.id} className="mr-details" open={edit}>
        <summary>{junk ? "Change where it goes" : "The email, and changes"}</summary>
        {edit ? <EditForm letter={letter} /> : (
          <dl className="mr-dl">
            {letter.emailBody && <div><dt>Email to {letter.client?.contactName ?? letter.emailTo}, saved as a draft with the scan attached</dt><dd><div className="mr-mail"><b>{letter.emailSubject}</b>{"\n\n"}{letter.emailBody}</div></dd></div>}
            {!junk && !letter.emailBody && <div><dt>Email</dt><dd className="muted">No email. This client has no contact address.</dd></div>}
            <div><Link className="mr-link" href={`${base}&edit=1`}>Change these</Link></div>
          </dl>
        )}
      </details>
    </>
  );
}

function EditForm({ letter }: { letter: Letter }) {
  return (
    <div className="mr-form" style={{ marginTop: 16 }}>
      <ActionForm action={editAction} submit="Save changes">
        <input type="hidden" name="letterId" value={letter.id} />
        <div className="fld"><label className="f" htmlFor="folder">Folder</label><input id="folder" type="text" name="folder" defaultValue={letter.folder ?? ""} /></div>
        <div className="fld"><label className="f" htmlFor="fileName">File name</label><input id="fileName" type="text" name="fileName" defaultValue={letter.fileName ?? ""} /></div>
        {letter.emailBody !== null && <>
          <div className="fld"><label className="f" htmlFor="emailTo">Email to</label><input id="emailTo" type="text" name="emailTo" defaultValue={letter.emailTo ?? ""} /></div>
          <div className="fld"><label className="f" htmlFor="emailSubject">Subject</label><input id="emailSubject" type="text" name="emailSubject" defaultValue={letter.emailSubject ?? ""} /></div>
          <div className="fld"><label className="f" htmlFor="emailBody">Email</label><textarea id="emailBody" name="emailBody" defaultValue={letter.emailBody ?? ""} /></div>
        </>}
      </ActionForm>
      <p style={{ marginTop: 10 }}><Link className="mr-link" href={`/mailroom/${letter.batchId}?l=${letter.id}`}>Cancel</Link></p>
    </div>
  );
}

function WhoseLetter({ letter, all }: { letter: Letter; all: MailroomClient[] }) {
  const r = letter.read!;
  const asking = letter.matchKind === "ask";
  const others = all.filter((c) => !letter.candidates.some((x) => x.id === c.id));
  return (
    <>
      <h1>Whose letter is this?</h1>
      <p className="mr-what">It&apos;s addressed to {r.addressee}{asking && letter.matchReason ? `. ${letter.matchReason}.` : "."}</p>
      <div className="mr-form" style={{ marginTop: 24 }}>
        <ActionForm action={chooseClientAction} submit="Use this client">
          <input type="hidden" name="letterId" value={letter.id} />
          {letter.candidates.map((c) => (
            <label key={c.id} className="mr-choice"><input type="radio" name="clientId" value={c.id} /><span>{c.name}<br /><span className="small muted">{[c.crNo && `CR ${c.crNo}`, c.brNo && `BR ${c.brNo}`].filter(Boolean).join(" · ")}</span></span></label>
          ))}
          <div className="fld" style={{ marginTop: 16 }}>
            <label className="f" htmlFor="other">{letter.candidates.length ? "Someone else" : "Choose the client"}</label>
            <select id="other" name="clientId" defaultValue="">
              <option value="">…</option>
              {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </ActionForm>
      </div>
      <div style={{ marginTop: 20 }}>
        <ActionForm action={notForAClientAction} submit="Not for any client" tone="secondary"><input type="hidden" name="letterId" value={letter.id} /></ActionForm>
      </div>
      {!asking && <p style={{ marginTop: 16 }}><Link className="mr-link" href={`/mailroom/${letter.batchId}?l=${letter.id}`}>Cancel</Link></p>}
    </>
  );
}

function Filed({ letter, display }: { letter: Letter; display?: Display }) {
  return (
    <>
      <h1>{letter.client?.name ?? "Filed"}</h1>
      <p className="mr-what">Saved to {filingLine(letter.folder, null, display).path}{letter.draftRef ? ". The email is in your drafts." : "."}</p>
      <div className="mr-actions">
        <Link className="btn" href={`/mailroom/${letter.batchId}`}>Next letter</Link>
        <ActionForm action={undoAction} submit="Undo" tone="secondary"><input type="hidden" name="letterId" value={letter.id} /></ActionForm>
      </div>
    </>
  );
}

function Failed({ letter }: { letter: Letter }) {
  return (
    <>
      <h1>We couldn&apos;t read this letter</h1>
      <p className="mr-what">File it by hand from the scan. {letter.error ? <span className="small muted">({letter.error})</span> : null}</p>
    </>
  );
}
