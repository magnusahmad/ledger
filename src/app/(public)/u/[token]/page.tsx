import { getCtx } from "@/server/ctx";
import { portalView } from "@/domain/portal";
import { portalUploadAction, portalFieldAction } from "@/server/actions";
import { ActionForm } from "@/components/ActionForm";
import type { Lang } from "@/db/schema";

const T = {
  en: { title: "Documents and details we need", intro: "Upload each item below. Everything is sent securely to your company secretary.", upload: "Upload", save: "Save", done: "Received", none: "Nothing more is needed right now. Thank you.", optional: "optional", lang: "Language" },
  tc: { title: "所需文件及資料", intro: "請逐項上載以下文件，所有資料均以安全方式傳送予您的公司秘書。", upload: "上載", save: "儲存", done: "已收到", none: "暫時毋須提供其他資料，謝謝。", optional: "選填", lang: "語言" },
  sc: { title: "所需文件及资料", intro: "请逐项上传以下文件，所有资料均以安全方式传送给您的公司秘书。", upload: "上传", save: "保存", done: "已收到", none: "暂时无须提供其他资料，谢谢。", optional: "选填", lang: "语言" },
};

export default async function Portal({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  const { lang: l } = await searchParams;
  const ctx = getCtx();
  const view = await portalView(ctx, token, (["en", "tc", "sc"].includes(l ?? "") ? l : undefined) as Lang | undefined).catch(() => null);
  if (!view) return <div className="card"><h1>This link isn’t valid</h1><p className="muted">Please ask us for a new one.</p></div>;
  const t = T[view.language];
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <div><h1>{t.title}</h1><p className="sub">{view.clientName}</p></div>
        <nav className="row small" aria-label={t.lang}>{(["en", "tc", "sc"] as const).map((k) => <a key={k} href={`?lang=${k}`} aria-current={view.language === k ? "true" : undefined} style={{ fontWeight: view.language === k ? 600 : 400 }}>{k === "en" ? "EN" : k === "tc" ? "繁" : "简"}</a>)}</nav>
      </div>
      <p className="muted">{t.intro}</p>
      {view.tasks.map((task) => (
        <div className="card" key={task.taskId}>
          <h2>{task.title}</h2>
          {task.items.length === 0 && <p className="empty">{t.none}</p>}
          {task.items.map((it) => (
            <div key={`${it.key}-${it.personId}`} className="chk" style={{ gridTemplateColumns: "20px minmax(0,1fr)" }}>
              <span className="ic">{it.status === "received" ? "●" : "○"}</span>
              <div>
                <div>{it.label}{it.optional && <span className="muted small"> ({t.optional})</span>}{it.status === "received" && <span className="small" style={{ color: "var(--ok)" }}> · {t.done}</span>}</div>
                {it.value && <div className="small muted">{it.value}</div>}
                {it.status === "needed" && (it.kind === "file" ? (
                  <ActionForm action={portalUploadAction.bind(null, token, task.taskId, it.key)} submit={t.upload} tone="secondary">
                    <input type="file" name="file" accept="image/*,application/pdf" capture={it.key === "selfie" ? "user" : undefined} required style={{ marginTop: 6 }} />
                  </ActionForm>
                ) : (
                  <ActionForm action={portalFieldAction.bind(null, token, task.taskId, it.key)} submit={t.save} tone="secondary">
                    <input type="text" name="value" required style={{ marginTop: 6 }} aria-label={it.label} />
                  </ActionForm>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
      {view.tasks.length === 0 && <p className="empty">{t.none}</p>}
    </>
  );
}
