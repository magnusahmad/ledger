import Link from "next/link";
import { getCtx } from "@/server/ctx";
import { clientNames } from "@/server/queries";
import { ActionForm } from "@/components/ActionForm";
import { pasteRequestAction } from "@/server/actions";
import { listPlaybooks } from "@/domain/playbooks";
import { peopleLinkedToClient } from "@/domain/people";
import { itemKind, itemLabel } from "@/domain/labels";
import { ClientPicker, ManualRequestForm, type PlaybookOption } from "./manual";

export default async function NewRequest({ searchParams }: { searchParams: Promise<{ client?: string; mode?: string }> }) {
  const { client: clientId, mode } = await searchParams;
  const manual = mode === "manual";
  const ctx = getCtx();
  const clients = await clientNames(ctx);
  const cl = clients.find((c) => c.id === clientId) ?? null;
  const q = (m: "message" | "manual", withClient = true) => `/new?mode=${m}${withClient && cl ? `&client=${cl.id}` : ""}`;

  const fixedClient = cl && (
    <div className="fld"><span className="f">Client</span>
      <div className="row" style={{ gap: 10 }}><b style={{ fontWeight: 500 }}>{cl.nameEn}</b>{cl.nameTc && <span className="muted">{cl.nameTc}</span>}<Link className="small muted lnk" href={q(manual ? "manual" : "message", false)}>Change</Link></div>
    </div>
  );

  let manualForm = null;
  if (manual && cl) {
    const [pbs, people] = await Promise.all([listPlaybooks(ctx), peopleLinkedToClient(ctx, cl.id)]);
    const options: PlaybookOption[] = pbs
      .filter((p) => p.jurisdiction === cl.jurisdiction && !p.id.endsWith(".custom"))
      .sort((a, b) => a.name.en.localeCompare(b.name.en))
      .map((p) => ({
        id: p.id, name: p.name.en, category: p.category,
        person: !!p.personSelection && p.personSelection !== "none",
        effDate: p.requirements.some((r) => r.key === "effDate"),
        fields: p.requirements.filter((r) => itemKind(r.key) === "data" && r.key !== "fullName").map((r) => ({ key: r.key, label: itemLabel(r.key) })),
      }));
    manualForm = <ManualRequestForm clientId={cl.id} playbooks={options} people={people.filter((p) => p.kind === "individual").map((p) => ({ id: p.id, name: p.nameZh ? `${p.nameEn} ${p.nameZh}` : p.nameEn }))} />;
  }

  return (
    <>
      <div className="top"><div>{cl && <Link href={`/clients/${cl.id}`} className="back">← {cl.nameEn}</Link>}<h1>New request</h1>
        <p className="sub">{manual ? "For instructions given in a meeting or on a call. Choose what needs doing and enter what you already know." : "Paste a message from WeChat, WhatsApp or a voice-note transcript. Client emails come in automatically."}</p></div></div>
      <nav className="tabs" aria-label="How the request came in">
        <Link className="tab" href={q("message")} aria-current={!manual ? "page" : undefined}>From a message</Link>
        <Link className="tab" href={q("manual")} aria-current={manual ? "page" : undefined}>Start manually</Link>
      </nav>
      <div className="card" style={{ maxWidth: 760 }}>
        {manual ? (
          cl ? <>{fixedClient}<div style={{ marginTop: 18 }}>{manualForm}</div></> : <ClientPicker clients={clients.map((c) => ({ id: c.id, name: c.nameTc ? `${c.nameEn} ${c.nameTc}` : c.nameEn }))} base="/new?mode=manual" />
        ) : (
          <ActionForm action={pasteRequestAction} submit="Read message" resetOnSuccess>
            {cl ? <><input type="hidden" name="clientId" value={cl.id} />{fixedClient}</> : (
              <div className="fld"><label className="f" htmlFor="clientId">Client</label>
                <select id="clientId" name="clientId" defaultValue=""><option value="">Work it out from the message</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nameEn}{c.nameTc ? ` ${c.nameTc}` : ""}</option>)}</select></div>
            )}
            <div className="fld"><label className="f" htmlFor="text">Message</label><textarea id="text" name="text" required placeholder="e.g. 陳生：下個月1號搬去觀塘鴻圖道88號12樓，另外想加我太太做董事。" /></div>
          </ActionForm>
        )}
      </div>
    </>
  );
}
