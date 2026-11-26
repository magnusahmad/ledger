import "../(annual)/annual/annual.css";
import { ActionForm } from "@/components/ActionForm";
import { signInAction } from "@/server/annual-actions";
import { getCtx } from "@/server/ctx";
import { ssoConfig } from "@/lib/sso";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const microsoft = !!ssoConfig(getCtx().config);
  const password = (
    <ActionForm action={signInAction} submit="Sign in">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="an-field">Email<input type="email" name="email" autoComplete="username" required /></label>
      <label className="an-field">Password<input type="password" name="password" autoComplete="current-password" required /></label>
    </ActionForm>
  );
  return (
    <div className="an-login">
      <h1>Sign in</h1>
      <p className="sub">Clerk, on your office network.</p>
      {error && <div className="banner amber" style={{ marginTop: 18 }}>{error}</div>}
      {microsoft ? (
        <>
          <a className="btn an-sso" href={`/api/auth/microsoft/start${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Sign in with Microsoft</a>
          <details className="an-more"><summary>Use a password</summary><div className="an-inner">{password}</div></details>
        </>
      ) : password}
    </div>
  );
}
