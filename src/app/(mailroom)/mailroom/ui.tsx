"use client";
// Client pieces for the mail room: adding a scan by hand, showing a scan, and the review
// screen's list toggle and keyboard shortcuts.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { keyAction } from "@/mailroom/review";
import { ActionForm } from "@/components/ActionForm";
import { uploadScanAction } from "@/server/mailroom-actions";

export function AddScan() {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <ActionForm action={uploadScanAction} submit="Add scan" tone="secondary" resetOnSuccess>
      <input ref={ref} type="file" name="file" accept="application/pdf,image/jpeg,image/png" multiple required aria-label="Scan file" />
    </ActionForm>
  );
}

/** The scan, drawn page by page with pdf.js (browser PDF viewers can't be relied on in iframes). */
export function ScanView({ src }: { src: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/api/mailroom/pdf-worker";
        const doc = await pdfjs.getDocument(src).promise;
        const el = box.current;
        if (!el || cancelled) return;
        el.replaceChildren();
        const width = el.clientWidth - 2;
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: (width / base.width) * (window.devicePixelRatio || 1) });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width; canvas.height = vp.height;
          canvas.style.width = "100%";
          canvas.setAttribute("aria-label", `Page ${n} of ${doc.numPages}`);
          if (cancelled) return;
          el.appendChild(canvas);
          await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
        }
      } catch { if (!cancelled) setFailed(true); }
    })();
    return () => { cancelled = true; };
  }, [src]);
  return failed ? <p className="empty" style={{ padding: 20 }}>The scan couldn&apos;t be shown here. <a className="lnk" href={src} target="_blank">Open it</a>.</p> : <div ref={box} className="mr-pages" />;
}

const LIST_KEY = "mailroom.list";
// Whether this person keeps the letter list open, remembered in their browser.
const listListeners = new Set<() => void>();
let listMemo = true; // used when the browser won't store it (private windows)
const readListOpen = () => { try { const v = localStorage.getItem(LIST_KEY); return v ? v !== "hidden" : listMemo; } catch { return listMemo; } };
const subscribeList = (f: () => void) => { listListeners.add(f); return () => { listListeners.delete(f); }; };
const setListPref = (open: boolean) => { listMemo = open; try { localStorage.setItem(LIST_KEY, open ? "shown" : "hidden"); } catch { /* private window */ } listListeners.forEach((f) => f()); };

/** The review screen: the letter list on the left (hideable with [), the scan, and the decision.
 *  With the list hidden, a plain decision moves into a bar under the scan. */
export function ReviewShell({ list, scan, panel, bar, hasBar, prevHref, nextHref, changeHref }: {
  list: ReactNode; scan: ReactNode; panel: ReactNode; bar: ReactNode; hasBar: boolean;
  prevHref: string | null; nextHref: string | null; changeHref: string | null;
}) {
  const router = useRouter();
  const listOpen = useSyncExternalStore(subscribeList, readListOpen, () => true);
  const toggle = () => setListPref(!readListOpen());
  const focus = !listOpen && hasBar;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
      const a = keyAction({ key: e.key, typing, modifier: e.metaKey || e.ctrlKey || e.altKey });
      if (!a) return;
      if (a === "toggleList") toggle();
      else if (a === "next" && nextHref) router.push(nextHref);
      else if (a === "prev" && prevHref) router.push(prevHref);
      else if (a === "change" && changeHref) router.push(changeHref);
      else if (a === "approve") {
        const scope = document.querySelector(focus ? ".mr-bar-dock" : ".mr-panel");
        const b = scope?.querySelector<HTMLButtonElement>("[data-approve] button[type=submit]");
        if (!b || b.disabled) return;
        b.click();
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div className={`mr-shell${listOpen ? " list-open" : ""}${focus ? " focus" : ""}`}>
      <nav className="mr-list" aria-label="Letters in this scan">
        <button type="button" className="mr-toggle" onClick={toggle} aria-label="Hide the list">Hide <kbd>[</kbd></button>
        {list}
      </nav>
      <div className="mr-stage">
        {!listOpen && <button type="button" className="mr-toggle mr-show" onClick={toggle} aria-label="Show the list">Show list <kbd>[</kbd></button>}
        <div className="mr-scan">{scan}</div>
        <div className="mr-panel">{panel}</div>
        {focus && bar}
      </div>
    </div>
  );
}
