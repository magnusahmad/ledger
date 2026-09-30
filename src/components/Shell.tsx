"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

type Counts = { pending: number; openTasks: number; unmatched: number; unpaid: number };

const NAV: { href: string; label: string; count?: keyof Counts; hot?: boolean }[] = [
  { href: "/", label: "Today", count: "pending", hot: true },
  { href: "/inbox", label: "Inbox" },
  { href: "/clients", label: "Clients" },
  { href: "/tasks", label: "Tasks", count: "openTasks" },
  { href: "/invoices", label: "Invoices", count: "unpaid" },
  { href: "/payments", label: "Payments", count: "unmatched" },
  { href: "/batch", label: "Batch" },
  { href: "/mail", label: "Mail" },
  { href: "/playbooks", label: "Playbooks" },
  { href: "/settings", label: "Settings" },
];

export function Shell({ counts, children }: { counts: Counts; children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <div className="app">
      <header className="topbar">
        <button className="menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>☰</button>
        <Link href="/" className="brand" style={{ padding: 0 }}>Harbourline Desk</Link>
        {counts.pending > 0 ? <Link href="/" className="cnt hot" aria-label={`${counts.pending} items need you`}>{counts.pending}</Link> : <span />}
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <nav className={`rail${open ? " open" : ""}`} aria-label="Main" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
        <Link href="/" className="brand">Harbourline Desk<small>Caine Road Corporate Services</small></Link>
        <div className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="nb" aria-current={active(n.href) ? "page" : undefined}>
              <span>{n.label}</span>
              {n.count && counts[n.count] > 0 && <span className={`cnt${n.hot ? " hot" : ""}`}>{counts[n.count]}</span>}
            </Link>
          ))}
        </div>
        <div className="user"><div className="av">KY</div><div><b>Karen Yip</b><span>Senior Company Secretary</span></div></div>
      </nav>
      <main id="main">{children}</main>
    </div>
  );
}
