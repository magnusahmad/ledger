import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { getCtx } from "@/server/ctx";
import { appUser, bankAccount, businessRegistration, charge, client, conversation, document, filing, invoice, significantController, cddRecord, person } from "@/db/schema";
import { appointmentHistory, contactsFor, officersAsAt } from "@/domain/records";
import { issuedAsAt, membersAsAt, movementHistory } from "@/domain/shares";
import { upcomingDeadlines } from "@/domain/deadlines";
import { taskRows } from "@/server/queries";
import { money } from "@/domain/labels";
import { DeadlineStamp, Pill, fmt, ago, STATUS_TONE } from "@/components/ui";

const TABS = [["overview", "Overview"], ["company", "Company"], ["shares", "Shares and members"], ["officers", "Officers and controllers"], ["records", "Records and filings"], ["mail", "Correspondence"], ["contacts", "Contacts"], ["billing", "Billing"]] as const;
const ROLE: Record<string, string> = { director: "Director", secretary: "Company secretary", alternate_director: "Alternate director", reserve_director: "Reserve director", legal_representative: "Legal representative 法定代表人", supervisor: "Supervisor 监事", manager: "Manager 经理", administrator: "Administrator", responsible_person: "Responsible person 代表人" };

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; asAt?: string }> }) {
  const { id } = await params;
  const { tab = "overview", asAt } = await searchParams;
  const ctx = getCtx();
  const c = await ctx.db.query.client.findFirst({ where: and(eq(client.id, id), eq(client.firmId, ctx.firmId)) });
  if (!c) notFound();
  const today = ctx.clock.today();
  const date = asAt && /^\d{4}-\d{2}-\d{2}$/.test(asAt) ? asAt : today;
  const staff = c.staffId ? await ctx.db.query.appUser.findFirst({ where: eq(appUser.id, c.staffId) }) : null;
  const header = (
    <>
      <div className="top">
        <div>
          <Link href="/clients" className="back">← Clients</Link>
          <h1>{c.nameEn}</h1>
          <p className="sub">{[c.nameTc, c.companyNumber && `No. ${c.companyNumber}`, c.companyType, c.operatingStatus.replace("_", " "), staff && `Staff in charge: ${staff.name}`].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="row">{c.lifecycle === "prospect" && <Pill tone="blue">New prospect</Pill>}<Link className="btn" href={`/new?client=${c.id}`}>New request</Link></div>
      </div>
      <nav className="tabs" aria-label="Client sections">{TABS.map(([k, l]) => <Link key={k} href={`/clients/${c.id}?tab=${k}`} className="tab" aria-current={tab === k ? "page" : undefined}>{l}</Link>)}</nav>
    </>
  );
  const asAtForm = (
    <form className="row small" style={{ marginBottom: 12 }}><input type="hidden" name="tab" value={tab} /><label htmlFor="asAt" className="muted">Register as at</label><input id="asAt" type="date" name="asAt" defaultValue={date} style={{ width: 170 }} /><button className="btn sm sec2">Show</button><a className="btn sm sec2" href={`/api/clients/${c.id}/registers?asAt=${date}`}>Download registers</a></form>
  );

  if (tab === "overview") {
    const tasks = await taskRows(ctx, { clientId: c.id, status: "all" });
    const dl = await upcomingDeadlines(ctx, { clientId: c.id, withinDays: 365 });
    const invs = await ctx.db.select().from(invoice).where(eq(invoice.clientId, c.id)).orderBy(desc(invoice.createdAt));
    const owes = tasks.filter((t) => t.status === "open" && t.outstanding.length);
    return (<>{header}<div className="cols"><div className="stack">
      <div className="card"><h2>Open tasks</h2><ul className="list">{tasks.filter((t) => t.status === "open").map((t) => <li key={t.id} className="item"><div className="main"><Link href={`/tasks/${t.id}`} className="t">{t.title}</Link><div className="m">{t.stepLabel}</div></div><DeadlineStamp dueDate={t.dueDate} today={today} /></li>)}{!tasks.some((t) => t.status === "open") && <li className="empty">No open tasks.</li>}</ul></div>
      {owes.length > 0 && <div className="card"><h2>What the client owes us</h2>{owes.map((t) => <div key={t.id} className="small" style={{ marginBottom: 8 }}><b>{t.title}:</b> {t.outstanding.join(", ")}</div>)}</div>}
      <div className="card"><h2>Completed</h2><ul className="list">{tasks.filter((t) => t.status === "done").map((t) => <li key={t.id} className="item"><div className="main"><Link href={`/tasks/${t.id}`} className="t">{t.title}</Link><div className="m">{t.completedAt ? fmt(t.completedAt) : ""}</div></div><Pill tone="ok">Done</Pill></li>)}</ul></div>
    </div><div className="stack">
      <div className="card"><h2>Deadlines</h2><ul className="list">{dl.map((d) => <li key={d.periodKey ?? d.key} className="item"><div className="main"><div className="t">{d.label}</div><div className="m">{fmt(d.dueDate)}</div></div><DeadlineStamp dueDate={d.dueDate} today={today} /></li>)}{dl.length === 0 && <li className="empty">Nothing due in the next year{c.operatingStatus === "dormant" ? " (AGM and audit suppressed: dormant company)" : ""}.</li>}</ul>
        {c.operatingStatus === "dormant" && <p className="small muted">Dormant company: AGM and audit deadlines are suppressed; annual returns still apply.</p>}</div>
      <div className="card"><h2>Invoices</h2><ul className="list">{invs.slice(0, 6).map((i) => <li key={i.id} className="item"><div className="main"><Link href={`/invoices/${i.id}`} className="t">{i.number}</Link><div className="m">{money(i.totalCents)} · {i.issuedOn ? fmt(i.issuedOn) : "draft"}</div></div><Pill tone={STATUS_TONE[i.status]}>{i.status.replace("_", " ")}</Pill></li>)}</ul></div>
    </div></div></>);
  }

  if (tab === "company") {
    const br = await ctx.db.query.businessRegistration.findFirst({ where: eq(businessRegistration.clientId, c.id) });
    const banks = await ctx.db.select().from(bankAccount).where(eq(bankAccount.clientId, c.id));
    const jd = c.jurisdictionData as Record<string, unknown>;
    return (<>{header}<div className="grid2">
      <div className="card"><h2>Registration</h2><dl className="kv">
        <dt>Jurisdiction</dt><dd>{c.jurisdiction}</dd><dt>Company type</dt><dd>{c.companyType}</dd><dt>Company number</dt><dd>{c.companyNumber ?? "—"}</dd>
        <dt>Incorporated</dt><dd>{fmt(c.incorporatedOn)}</dd><dt>Status</dt><dd>{c.lifecycle} · {c.operatingStatus.replace("_", " ")}</dd><dt>Client group</dt><dd>{c.clientGroup ?? "—"}</dd>
        <dt>Registered office</dt><dd>{c.regOfficeEn}{c.regOfficeZh && <div>{c.regOfficeZh}</div>}</dd><dt>Business</dt><dd>{c.businessNatureEn}{c.businessNatureZh && <div>{c.businessNatureZh}</div>}</dd>
        {typeof jd.uscc === "string" && <><dt>Unified social credit code</dt><dd>{jd.uscc}</dd></>}
        {typeof jd.ubn === "string" && <><dt>Unified business number</dt><dd>{jd.ubn}</dd></>}
        {typeof jd.businessScope === "string" && <><dt>Business scope</dt><dd>{jd.businessScope}</dd></>}
      </dl></div>
      <div className="card"><h2>Key dates and settings</h2><dl className="kv">
        <dt>Financial year end</dt><dd>{c.fyeDay}/{c.fyeMonth}</dd><dt>Accounts made up to</dt><dd>{fmt(c.accountsLastMadeUpTo) || "—"}</dd><dt>Last AGM</dt><dd>{fmt(jd.lastAgm as string) || "—"}</dd>
        <dt>Auditor</dt><dd>{c.auditor ?? "—"}</dd><dt>Business registration</dt><dd>{br ? `${br.brNumber} · ${br.termYears}-year · expires ${fmt(br.expiresOn)}` : "—"}</dd>
        <dt>Document language</dt><dd>{c.docLang}</dd><dt>Message language</dt><dd>{c.messageLang}</dd><dt>Payment terms</dt><dd>{c.paymentTermsDays ? `${c.paymentTermsDays} days` : "Upfront"}</dd>
        <dt>Risk rating</dt><dd>{c.riskRating ?? "—"}</dd><dt>Designated representative</dt><dd>{c.designatedRep ?? "—"}</dd><dt>Registers kept at</dt><dd>{c.registersKeptAt ?? "—"}</dd>
        <dt>CR e-account</dt><dd className="muted">Held in the secrets vault; never displayed</dd>
      </dl>
      {banks.length > 0 && <><h3>Banks and signatories</h3>{banks.map((b) => <div key={b.id} className="small">{b.bank} {b.accountMasked} · {b.signatories}</div>)}</>}</div>
      {Array.isArray(jd.subscriptions) && <div className="card"><h2>Registered capital and contributions</h2><table className="tbl register-table"><thead><tr><th>Shareholder</th><th>Subscribed</th><th>Paid</th><th>Due by</th></tr></thead><tbody>{(jd.subscriptions as { holder: string; amountCents: number; paidCents?: number; deadline: string }[]).map((s, i) => <tr key={i}><td>{s.holder}</td><td>{money(s.amountCents, "RMB")}</td><td>{money(s.paidCents ?? 0, "RMB")}</td><td>{fmt(s.deadline)}{s.deadline > "2032-06-30" && <div className="small" style={{ color: "var(--red)" }}>Beyond 30 June 2032: adjust by 30 June 2027</div>}</td></tr>)}</tbody></table></div>}
    </div></>);
  }

  if (tab === "shares") {
    const members = await membersAsAt(ctx, c.id, date);
    const cap = await issuedAsAt(ctx, c.id, date);
    const moves = await movementHistory(ctx, c.id);
    const people = await ctx.db.select().from(person).where(eq(person.firmId, ctx.firmId));
    const pn = (id: string | null) => people.find((p) => p.id === id)?.nameEn ?? "—";
    return (<>{header}{asAtForm}<div className="stack">
      <div className="card scroll-x"><h2>Share capital</h2><table className="tbl register-table"><thead><tr><th>Class</th><th>Currency</th><th>Issued</th><th>Paid up</th></tr></thead><tbody>{cap.map((x) => <tr key={x.shareClassId}><td>{x.name}</td><td>{x.currency}</td><td>{x.issued.toLocaleString("en-US")}</td><td>{money(x.paidUpCents, x.currency)}</td></tr>)}</tbody></table></div>
      <div className="card scroll-x"><h2>Members as at {fmt(date)}</h2><table className="tbl register-table"><thead><tr><th>Member</th><th>Class</th><th>Holding</th><th>%</th></tr></thead><tbody>{members.map((m) => <tr key={m.personId + m.shareClassId}><td>{m.name}{m.nameZh && <span className="muted"> {m.nameZh}</span>}</td><td>{m.className}</td><td>{m.quantity.toLocaleString("en-US")}</td><td>{m.percent}%</td></tr>)}</tbody></table></div>
      <div className="card scroll-x"><h2>Share movements</h2><table className="tbl register-table"><thead><tr><th>Date</th><th>Movement</th><th>From</th><th>To</th><th>Number</th><th>Stamp duty</th></tr></thead><tbody>{moves.map((m) => <tr key={m.id}><td>{fmt(m.date)}</td><td>{m.kind}{m.note && <div className="small muted">{m.note}</div>}</td><td>{pn(m.fromPersonId)}</td><td>{pn(m.toPersonId)}</td><td>{m.quantity.toLocaleString("en-US")}</td><td>{m.stampDutyCents ? money(m.stampDutyCents) : ""}</td></tr>)}</tbody></table></div>
    </div></>);
  }

  if (tab === "officers") {
    const current = await officersAsAt(ctx, c.id, date);
    const history = await appointmentHistory(ctx, c.id);
    const scs = await ctx.db.select({ s: significantController, p: person }).from(significantController).innerJoin(person, eq(person.id, significantController.personId)).where(eq(significantController.clientId, c.id));
    const cdd = await ctx.db.select().from(cddRecord);
    const kyc = (pid: string) => cdd.filter((r) => r.personId === pid).sort((a, b) => b.reviewDueOn.localeCompare(a.reviewDueOn))[0];
    return (<>{header}{asAtForm}<div className="stack">
      <div className="card scroll-x"><h2>Officers as at {fmt(date)}</h2><table className="tbl register-table"><thead><tr><th>Name</th><th>Role</th><th>Appointed</th><th>KYC</th></tr></thead><tbody>{current.map((o) => { const k = kyc(o.personId); return <tr key={o.id}><td>{o.person.nameEn}{o.person.nameZh && <span className="muted"> {o.person.nameZh}</span>}</td><td>{ROLE[o.role] ?? o.role}</td><td>{fmt(o.fromDate)}</td><td>{o.personId === "per_firm" ? <span className="muted small">Firm</span> : k ? <Pill tone={k.reviewDueOn < today ? "red" : "ok"}>Review {fmt(k.reviewDueOn)}</Pill> : <Pill tone="amber">None</Pill>}</td></tr>; })}</tbody></table></div>
      <div className="card scroll-x"><h2>Significant controllers</h2><table className="tbl register-table"><thead><tr><th>Name</th><th>Nature of control</th><th>Registrable since</th><th>Ceased</th></tr></thead><tbody>{scs.map(({ s, p }) => <tr key={s.id}><td>{p.nameEn}</td><td>{s.nature}</td><td>{fmt(s.registrableFrom)}</td><td>{fmt(s.ceasedOn) || "—"}</td></tr>)}</tbody></table></div>
      <div className="card scroll-x"><h2>Appointment history</h2><table className="tbl register-table"><thead><tr><th>Name</th><th>Role</th><th>From</th><th>To</th></tr></thead><tbody>{history.map((a) => <tr key={a.id}><td>{a.person.nameEn}</td><td>{ROLE[a.role] ?? a.role}</td><td>{fmt(a.fromDate)}</td><td>{fmt(a.toDate) || "—"}</td></tr>)}</tbody></table></div>
    </div></>);
  }

  if (tab === "records") {
    const fs = await ctx.db.select().from(filing).where(eq(filing.clientId, c.id)).orderBy(desc(filing.filedOn));
    const docs = await ctx.db.select().from(document).where(eq(document.clientId, c.id)).orderBy(desc(document.createdAt));
    const chs = await ctx.db.select().from(charge).where(eq(charge.clientId, c.id));
    return (<>{header}<div className="stack">
      <div className="card scroll-x"><h2>Filing history</h2><table className="tbl register-table"><thead><tr><th>Filed</th><th>Form</th><th>Description</th><th>Reference</th></tr></thead><tbody>{fs.map((f) => <tr key={f.id}><td>{fmt(f.filedOn)}</td><td>{f.form}</td><td>{f.description}{f.sourceTaskId && <div className="small"><Link href={`/tasks/${f.sourceTaskId}`}>From task</Link></div>}</td><td className="mono">{f.reference ?? ""}</td></tr>)}</tbody></table></div>
      <div className="card"><h2>Documents</h2><ul className="list">{docs.map((d) => <li key={d.id} className="item"><div className="main"><a href={`/api/docs/${d.id}`} className="t" target="_blank">{d.title}</a><div className="m">{d.kind.replace("_", " ")} · {d.source} · {fmt(d.createdAt)}</div></div></li>)}</ul></div>
      {chs.length > 0 && <div className="card"><h2>Charges</h2>{chs.map((x) => <div key={x.id} className="small">{fmt(x.createdOn)} · {x.chargee} · {x.description}</div>)}</div>}
    </div></>);
  }

  if (tab === "mail") {
    const convs = await ctx.db.select().from(conversation).where(eq(conversation.clientId, c.id)).orderBy(desc(conversation.lastMessageAt));
    return (<>{header}<div className="card"><ul className="list">{convs.map((v) => <li key={v.id} className="item"><div className="main"><Link href={`/inbox/${v.id}`} className="t">{v.subject}</Link><div className="m">{v.channel} · {v.counterpartyEmail} · {ago(v.lastMessageAt ?? v.createdAt)}</div></div></li>)}{convs.length === 0 && <li className="empty">No correspondence yet.</li>}</ul></div></>);
  }

  if (tab === "contacts") {
    const cs = await contactsFor(ctx, c.id);
    return (<>{header}<div className="card scroll-x"><table className="tbl register-table"><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Language</th><th></th></tr></thead><tbody>{cs.map((x) => <tr key={x.id}><td>{x.name}</td><td className="small">{x.role}</td><td className="small">{x.email ?? x.channel}</td><td>{x.language}</td><td>{x.isBilling && <Pill>Invoices</Pill>} {x.isInstructing && <Pill tone="blue">Instructs</Pill>}</td></tr>)}</tbody></table></div></>);
  }

  const invs = await ctx.db.select().from(invoice).where(eq(invoice.clientId, c.id)).orderBy(desc(invoice.createdAt));
  return (<>{header}<div className="card scroll-x"><p className="small muted">Usual terms: {c.paymentTermsDays ? `${c.paymentTermsDays} days credit` : "upfront"}</p><table className="tbl register-table"><thead><tr><th>Invoice</th><th>Issued</th><th>Total</th><th>Paid</th><th>Status</th><th>Xero</th></tr></thead><tbody>{invs.map((i) => <tr key={i.id}><td><Link href={`/invoices/${i.id}`}>{i.number}</Link></td><td>{fmt(i.issuedOn) || "draft"}</td><td>{money(i.totalCents)}</td><td>{money(i.paidCents)}</td><td><Pill tone={STATUS_TONE[i.status]}>{i.status.replace("_", " ")}</Pill></td><td className="small">{i.xeroStatus === "synced" ? "Synced" : i.xeroStatus === "error" ? "Error" : "—"}</td></tr>)}</tbody></table></div></>);
}
