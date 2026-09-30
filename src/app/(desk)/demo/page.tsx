import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { client, invoice, message, conversation } from "@/db/schema";
import { ActionForm, ActionButton } from "@/components/ActionForm";
import { simulatePaymentAction, simulateEmailAction, resetDemoAction, workerTickAction } from "@/server/actions";
import { money } from "@/domain/labels";
import { Pill } from "@/components/ui";
import { LiveRefresh } from "@/components/LiveRefresh";

export default async function Demo() {
  const ctx = getCtx();
  const invs = await ctx.db.select({ i: invoice, c: client }).from(invoice).innerJoin(client, eq(client.id, invoice.clientId)).where(inArray(invoice.status, ["sent", "part_paid"])).orderBy(desc(invoice.createdAt));
  const lastOut = await ctx.db.select({ m: message, v: conversation }).from(message).innerJoin(conversation, eq(conversation.id, message.conversationId)).where(eq(message.status, "sent")).orderBy(desc(message.at)).limit(1);
  const fake = ctx.config.mailProvider === "fake";
  const chan = await ctx.db.query.person.findFirst({ where: (p, { eq }) => eq(p.id, "per_p1") });
  const demoEmail = chan?.email ?? ctx.config.DEMO_EXISTING_CLIENT_EMAIL ?? "";
  return (
    <>
      <div className="top"><div><h1>Demo panel</h1><p className="sub">Controls for rehearsing and running the investor demo. Not part of the product navigation.</p></div><div className="row"><LiveRefresh /><ActionButton action={workerTickAction}>Run worker tick</ActionButton></div></div>
      <div className="grid2">
        <div className="card">
          <h2>1. Client email {fake ? <Pill>Demo mailbox</Pill> : <Pill tone="ok">Live: {ctx.config.mailProvider}</Pill>}</h2>
          {fake ? (
            <ActionForm action={simulateEmailAction} submit="Deliver email" resetOnSuccess>
              <div className="grid2"><div className="fld"><label className="f" htmlFor="from">From</label><input id="from" type="email" name="from" defaultValue={demoEmail} required /></div><div className="fld" style={{ marginTop: 0 }}><label className="f" htmlFor="fromName">Name</label><input id="fromName" type="text" name="fromName" defaultValue="CHAN Tai Man" /></div></div>
              <div className="fld"><label className="f" htmlFor="subject">Subject</label><input id="subject" type="text" name="subject" defaultValue="New director" /></div>
              <div className="fld"><label className="f" htmlFor="text">Body</label><textarea id="text" name="text" defaultValue="Hi Karen, we'd like to add my business partner Wong Ka Man as a director from 15 October. Thanks, Tai Man" /></div>
              <div className="fld"><label className="f" htmlFor="files">Attachments</label><input id="files" type="file" name="files" multiple /></div>
              {lastOut[0]?.m.rfcMessageId && <label className="small row" style={{ marginTop: 8 }}><input type="checkbox" name="inReplyTo" value={lastOut[0].m.rfcMessageId} /> Reply in the thread “{lastOut[0].m.subject}”</label>}
              <label className="small row" style={{ marginTop: 8 }}><input type="checkbox" name="asFirm" /> Send as the firm, as if replying in Gmail (the address above is the recipient)</label>
            </ActionForm>
          ) : <p className="small">Ask the investor to email <b>{ctx.mail.address || "the connected mailbox"}</b>. It appears on Today within about 20 seconds. Test sender recognised as an existing client: <b>{demoEmail}</b>.</p>}
        </div>
        <div className="card">
          <h2>2. Client pays {ctx.bank.name === "airwallex" ? <Pill tone="ok">Airwallex sandbox</Pill> : <Pill>Demo bank</Pill>}</h2>
          {invs.length === 0 ? <p className="empty">No unpaid invoices. Approve a reply with an invoice first.</p> : (
            <ActionForm action={simulatePaymentAction} submit="Send deposit">
              <div className="fld"><label className="f" htmlFor="invoiceId">Invoice</label><select id="invoiceId" name="invoiceId">{invs.map(({ i, c }) => <option key={i.id} value={i.id}>{i.number} · {c.nameEn} · {money(i.totalCents - i.paidCents)}</option>)}</select></div>
              <div className="grid2"><div className="fld"><label className="f" htmlFor="payer">Payer name</label><input id="payer" type="text" name="payer" defaultValue="Investor demo" /></div><div className="fld" style={{ marginTop: 0 }}><label className="f" htmlFor="amount">Amount (blank = in full)</label><input id="amount" type="number" name="amount" step="0.01" /></div></div>
              <div className="fld"><label className="f" htmlFor="reference">Reference (blank = invoice number)</label><input id="reference" type="text" name="reference" /></div>
            </ActionForm>
          )}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Reset</h2>
        <p className="small muted">Clears everything and reloads the fictional demo firm, clients and history. <Link href="/settings">Integration status</Link>.</p>
        <ActionButton action={resetDemoAction} tone="danger" confirm="Reset all demo data? This can't be undone.">Reset demo data</ActionButton>
      </div>
    </>
  );
}
