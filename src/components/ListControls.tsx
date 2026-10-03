import Link from "next/link";

export function ListControls({ path, q, page, pageSize, total, filters = {} }: { path: string; q: string; page: number; pageSize: number; total: number; filters?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (next: number) => {
    const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter((entry): entry is [string, string] => !!entry[1])), q, page: String(next), pageSize: String(pageSize) });
    return `${path}?${params}`;
  };
  return <>
    <form method="get" action={path} className="row" style={{ marginBottom: 12 }}>
      {Object.entries(filters).map(([key, value]) => value && <input key={key} type="hidden" name={key} value={value} />)}
      <div style={{ flex: "1 1 200px", minWidth: 0 }}><label className="f" htmlFor="list-search">Search</label><input id="list-search" type="search" name="q" defaultValue={q} maxLength={256} /></div>
      <button className="btn" type="submit">Search</button>
    </form>
    <nav className="row small" aria-label="Pagination" style={{ marginBottom: 12 }}>
      <span>{total} result{total === 1 ? "" : "s"} · Page {page} of {pages}</span>
      {page > 1 ? <Link className="btn sm secondary" href={href(page - 1)}>Previous</Link> : <span className="muted">Previous</span>}
      {page < pages ? <Link className="btn sm secondary" href={href(page + 1)}>Next</Link> : <span className="muted">Next</span>}
    </nav>
  </>;
}
