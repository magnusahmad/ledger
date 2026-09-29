import { getCtx } from "@/server/ctx";
import { openSigning } from "@/domain/signing";
import { SignFlow } from "./flow";

export default async function Sign({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await openSigning(getCtx(), token).catch((e: Error) => ({ error: e.message }));
  if ("error" in view) return <div className="card"><h1>This signing link can’t be used</h1><p className="muted">{view.error}</p></div>;
  return (
    <>
      <h1>Documents to sign</h1>
      <p className="sub">{view.companyName} · {view.taskTitle} · for {view.signer.name}</p>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Please review</h2>
        <ul>{view.documents.map((d) => <li key={d.id}><a href={`/api/sign/${token}/doc/${d.id}`} target="_blank">{d.title}</a></li>)}</ul>
      </div>
      <div className="card"><SignFlow token={token} signed={!!view.signer.signedAt} verified={view.signer.otpVerified} locked={view.signer.locked} email={view.signer.email} name={view.signer.name} /></div>
      <p className="small muted">Signed electronically under the Electronic Transactions Ordinance (Cap. 553). We record the time, your IP address and device, and the code sent to your email, on a certificate attached to the signed documents.</p>
    </>
  );
}
