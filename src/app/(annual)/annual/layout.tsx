import Link from "next/link";
import "./annual.css";
import { pilotCtx } from "@/server/pilot";
import { signOutAction } from "@/server/annual-actions";
import { firm } from "@/db/schema";
import { eq } from "drizzle-orm";
import { readClientListReport } from "@/annual/client-list";

export const metadata = { title: "Annual returns" };

export default async function AnnualLayout({ children }: { children: React.ReactNode }) {
  const { ctx, user } = await pilotCtx();
  const f = await ctx.db.query.firm.findFirst({ where: eq(firm.id, ctx.firmId) });
  // Shown only where the installation keeps a client list beside its records.
  const hasClientList = !!(await readClientListReport(ctx));
  return (
    <div className="an">
      <header className="an-bar">
        <nav><Link href="/annual" className="an-brand">Annual returns</Link><Link href="/annual/mail">Emails to sort</Link>{hasClientList && <Link href="/annual/differences">Differences</Link>}</nav>
        <div className="an-who">
          <span>{f?.legalName ?? ""}</span>
          {user && <form action={signOutAction}><span>{user.name}</span> · <button type="submit">Sign out</button></form>}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
