import { getCtx } from "@/server/ctx";
import { clientNames } from "@/server/queries";
import { ActionForm } from "@/components/ActionForm";
import { pasteRequestAction } from "@/server/actions";

export default async function NewRequest({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const clients = await clientNames(getCtx());
  return (
    <>
      <div className="top"><div><h1>New request</h1><p className="sub">Paste what a client sent on WeChat, WhatsApp or a voice-note transcript. Emails arrive on their own.</p></div></div>
      <div className="card" style={{ maxWidth: 760 }}>
        <ActionForm action={pasteRequestAction} submit="Read and prepare" resetOnSuccess>
          <div className="fld"><label className="f" htmlFor="clientId">Client</label>
            <select id="clientId" name="clientId" defaultValue={client ?? ""}><option value="">Not a client yet, or let Harbourline work it out</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nameEn}{c.nameTc ? ` ${c.nameTc}` : ""}</option>)}</select></div>
          <div className="fld"><label className="f" htmlFor="text">Message</label><textarea id="text" name="text" required placeholder="e.g. 陳生：下個月1號搬去觀塘鴻圖道88號12樓，另外想加我太太做董事。" /></div>
        </ActionForm>
      </div>
    </>
  );
}
