import "../(annual)/annual/annual.css";
import { ActionForm } from "@/components/ActionForm";
import { signInAction } from "@/server/annual-actions";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="an-login">
      <h1>Sign in</h1>
      <p className="sub">Harbourline, on your office network.</p>
      <ActionForm action={signInAction} submit="Sign in">
        <input type="hidden" name="next" value={next ?? ""} />
        <label className="an-field">Email<input type="email" name="email" autoComplete="username" required /></label>
        <label className="an-field">Password<input type="password" name="password" autoComplete="current-password" required /></label>
      </ActionForm>
    </div>
  );
}
