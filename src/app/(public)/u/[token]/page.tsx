import { getCtx } from "@/server/ctx";
import { portalView } from "@/domain/portal";
import { portalSubmitAction } from "@/server/actions";
import type { Lang } from "@/db/schema";
import { PortalForm } from "./form";

const T = {
  en: { title: "Details and documents", intro: "Fill in what you have and send. Files can be PDFs or photos, up to 15 MB each. You can come back to this link for anything else later.", send: "Send", sending: "Sending…", sent: "Received. Thank you.", empty: "Fill in at least one item before sending.", failed: "That didn’t go through. Please try again.", received: "Received", none: "We have everything we need for now. Thank you.", optional: "Optional", lang: "Language" },
  tc: { title: "所需資料及文件", intro: "請填寫現有資料後提交。文件可為 PDF 或相片，每個不超過 15 MB。其餘資料可稍後經此連結補交。", send: "提交", sending: "正在提交…", sent: "已收到，謝謝。", empty: "請至少填寫一項後再提交。", failed: "提交未成功，請再試一次。", received: "已收到", none: "暫時毋須提供其他資料，謝謝。", optional: "選填", lang: "語言" },
  sc: { title: "所需资料及文件", intro: "请填写现有资料后提交。文件可为 PDF 或照片，每个不超过 15 MB。其余资料可稍后通过此链接补交。", send: "提交", sending: "正在提交…", sent: "已收到，谢谢。", empty: "请至少填写一项后再提交。", failed: "提交未成功，请再试一次。", received: "已收到", none: "暂时无须提供其他资料，谢谢。", optional: "选填", lang: "语言" },
};

export default async function Portal({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  const { lang: l } = await searchParams;
  const ctx = getCtx();
  const view = await portalView(ctx, token, (["en", "tc", "sc"].includes(l ?? "") ? l : undefined) as Lang | undefined).catch(() => null);
  if (!view) return <div className="card"><h1>This link isn’t valid</h1><p className="muted">Please ask us for a new one.</p></div>;
  const t = T[view.language];
  const needed = view.tasks.some((task) => task.items.some((it) => it.status === "needed"));
  return (
    <div lang={view.language === "en" ? "en" : view.language === "sc" ? "zh-Hans" : "zh-Hant"}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div><h1>{t.title}</h1><p className="sub">{view.clientName}</p></div>
        <nav className="seg" aria-label={t.lang}>{(["en", "tc", "sc"] as const).map((k) => <a key={k} href={`?lang=${k}`} aria-current={view.language === k ? "true" : undefined}>{k === "en" ? "EN" : k === "tc" ? "繁" : "简"}</a>)}</nav>
      </div>
      {!needed ? <div className="card"><p style={{ margin: 0 }}>{t.none}</p></div> : (
        <>
          <p className="muted" style={{ marginTop: 0 }}>{t.intro}</p>
          <PortalForm action={portalSubmitAction.bind(null, token)} t={t}>
            {view.tasks.filter((task) => task.items.length).map((task) => (
              <div className="card" key={task.taskId}>
                <h2>{task.title}</h2>
                {task.items.map((it) => {
                  const id = `${task.taskId}-${it.key}`;
                  if (it.status === "received") return (
                    <div key={id} className="pf done"><span>{it.label}</span><span className="small" style={{ color: "var(--ok)" }}>✓ {t.received}</span></div>
                  );
                  return (
                    <div key={id} className="pf">
                      <label htmlFor={id}>{it.label}{it.optional && <span className="muted small"> · {t.optional}</span>}</label>
                      {it.kind === "file"
                        ? <input id={id} type="file" name={`f:${task.taskId}:${it.key}`} accept="image/*,application/pdf" capture={it.key === "selfie" ? "user" : undefined} />
                        : <input id={id} type="text" name={`v:${task.taskId}:${it.key}`} />}
                    </div>
                  );
                })}
              </div>
            ))}
          </PortalForm>
        </>
      )}
    </div>
  );
}
