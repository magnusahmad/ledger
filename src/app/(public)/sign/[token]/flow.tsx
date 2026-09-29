"use client";
import { useActionState, useRef, useState, useTransition } from "react";
import { requestOtpAction, verifyOtpAction, signAction, type ActionResult } from "@/server/actions";

export function SignFlow({ token, signed, verified, locked, email, name }: { token: string; signed: boolean; verified: boolean; locked: boolean; email: string; name: string }) {
  const [sent, setSent] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [vState, verify, vPending] = useActionState(verifyOtpAction.bind(null, token), null);
  const [sState, sign, sPending] = useActionState(signAction.bind(null, token), null);
  const [mode, setMode] = useState<"typed" | "drawn">("typed");
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [drawn, setDrawn] = useState("");

  if (signed || sState?.ok) return <div className="banner ok">Signed. Thank you, {name}. Signed copies will be sent to you by your company secretary.</div>;
  if (locked) return <div className="banner red">This link is locked after too many wrong codes. Please ask us for a new one.</div>;
  if (!verified && !vState?.ok) return (
    <div>
      <h2>Confirm it’s you</h2>
      <p className="small">We’ll email a 6-digit code to {email}.</p>
      <button className="btn sec2" disabled={pending} onClick={() => start(async () => setSent(await requestOtpAction(token)))}>{pending ? "Sending…" : sent?.ok ? "Send again" : "Email me a code"}</button>
      {sent?.error && <span className="small" style={{ color: "var(--red)", marginLeft: 8 }}>{sent.error}</span>}
      {sent?.ok && (
        <form action={verify} className="row" style={{ marginTop: 12 }}>
          <input type="text" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="123456" aria-label="Code" style={{ width: 140 }} required />
          <button className="btn" disabled={vPending}>{vPending ? "Checking…" : "Verify"}</button>
          {vState?.error && <span className="small" style={{ color: "var(--red)" }}>{vState.error}</span>}
        </form>
      )}
    </div>
  );
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return [(e.clientX - r.left) * (e.currentTarget.width / r.width), (e.clientY - r.top) * (e.currentTarget.height / r.height)] as const; };
  return (
    <form action={sign}>
      <h2>Sign</h2>
      <div className="row" role="tablist" style={{ marginBottom: 10 }}>
        <button type="button" className={`btn sm${mode === "typed" ? "" : " sec2"}`} onClick={() => setMode("typed")}>Type</button>
        <button type="button" className={`btn sm${mode === "drawn" ? "" : " sec2"}`} onClick={() => setMode("drawn")}>Draw</button>
      </div>
      {mode === "typed" ? (
        <input type="text" name="typed" defaultValue={name} aria-label="Your name as signature" required style={{ fontSize: 22, fontStyle: "italic", fontFamily: "cursive" }} />
      ) : (
        <>
          <canvas ref={canvas} width={600} height={180} style={{ width: "100%", maxWidth: 600, height: "auto", border: "1px solid var(--line2)", borderRadius: 8, touchAction: "none", background: "#fff" }}
            onPointerDown={(e) => { drawing.current = true; const c = e.currentTarget.getContext("2d")!; const [x, y] = pos(e); c.lineWidth = 2.5; c.lineCap = "round"; c.strokeStyle = "#1a2a73"; c.beginPath(); c.moveTo(x, y); }}
            onPointerMove={(e) => { if (!drawing.current) return; const c = e.currentTarget.getContext("2d")!; const [x, y] = pos(e); c.lineTo(x, y); c.stroke(); }}
            onPointerUp={() => { drawing.current = false; setDrawn(canvas.current!.toDataURL("image/png")); }} />
          <input type="hidden" name="drawn" value={drawn} />
          <button type="button" className="txt small" onClick={() => { canvas.current!.getContext("2d")!.clearRect(0, 0, 600, 180); setDrawn(""); }}>Clear</button>
        </>
      )}
      <p className="small muted">By signing you confirm you have read the documents above and agree to sign them electronically.</p>
      <div className="row"><button className="btn" disabled={sPending || (mode === "drawn" && !drawn)}>{sPending ? "Signing…" : "Sign documents"}</button>{sState?.error && <span className="small" style={{ color: "var(--red)" }}>{sState.error}</span>}</div>
    </form>
  );
}
