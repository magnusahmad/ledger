import Link from "next/link";
import "./mailroom.css";
import { getCtx } from "@/server/ctx";

export const metadata = { title: "Mail room" };

export default function MailroomLayout({ children }: { children: React.ReactNode }) {
  const ctx = getCtx();
  return (
    <div className="mr">
      <header className="mr-bar"><Link href="/mailroom">Mail room</Link><span>{ctx.config.MAILROOM_FIRM_NAME}</span></header>
      <main>{children}</main>
    </div>
  );
}
