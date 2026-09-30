import Link from "next/link";
import { getCtx } from "@/server/ctx";
import { mailItems } from "@/server/queries";
import { ActionForm } from "@/components/ActionForm";
import { logMailAction } from "@/server/actions";
import { Pill, fmt } from "@/components/ui";

export default async function Mail() {
  const ctx = getCtx();
  const rows = await mailItems(ctx);
  return (
    <>
      <div className="top"><div><h1>Registered office mail</h1><p className="sub">Upload a scanned letter. Harbourline matches it to the client, logs it and drafts the notice in their language.</p></div></div>
      <div className="card" style={{ maxWidth: 640 }}>
        <ActionForm action={logMailAction} submit="Log letter" resetOnSuccess>
          <div className="grid2"><div className="fld"><label className="f" htmlFor="file">Scan (PDF or photo)</label><input id="file" type="file" name="file" accept="application/pdf,image/*" required /></div>
            <div className="fld" style={{ marginTop: 0 }}><label className="f" htmlFor="receivedOn">Received</label><input id="receivedOn" type="date" name="receivedOn" defaultValue={ctx.clock.today()} /></div></div>
        </ActionForm>
      </div>
      <div className="card tight scroll-x" style={{ marginTop: 16 }}><table className="tbl"><thead><tr><th>Received</th><th>Client</th><th>From</th><th>Summary</th><th></th></tr></thead>
        <tbody>{rows.map(({ m, c }) => <tr key={m.id}><td>{fmt(m.receivedOn)}</td><td>{c ? <Link href={`/clients/${c.id}`}>{c.nameEn}</Link> : <span className="muted">Not matched</span>}</td><td>{m.sender}</td><td className="small">{m.summary}</td><td>{m.urgency === "urgent" && <Pill tone="red">Urgent</Pill>} {m.documentId && <a className="small" href={`/api/docs/${m.documentId}`} target="_blank">Scan</a>}</td></tr>)}</tbody></table>
        {rows.length === 0 && <p className="empty">No letters logged yet.</p>}</div>
    </>
  );
}
