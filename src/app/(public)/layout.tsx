export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)", padding: "14px 16px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", fontWeight: 600 }}>Caine Road Corporate Services <span className="muted" style={{ fontWeight: 400 }}>堅道企業服務</span></div>
      </header>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 64px" }}>{children}</div>
    </div>
  );
}
