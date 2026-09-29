// Local OpenSanctions matcher over the bulk "targets.simple.csv" export (non-commercial
// licence). Used when no API key is configured. Candidate generation by name tokens;
// the LLM adjudicator and a human decide what a hit means.
import { createReadStream, existsSync, statSync } from "node:fs";
import readline from "node:readline";
import type { ScreeningHit, ScreeningProvider, ScreeningQuery } from "../types";

type Row = { id: string; schema: string; names: string[]; birthDates: string[]; countries: string[]; datasets: string[]; topics: string[] };

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9㐀-鿿 ]/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => { const n = norm(s); return /[㐀-鿿]/.test(n) ? [n.replace(/\s/g, "")] : n.split(" ").filter((t) => t.length > 1); };

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c;
  }
  out.push(cur);
  return out;
}

export class LocalOpenSanctions implements ScreeningProvider {
  readonly name = "opensanctions-local";
  private rows: Row[] | null = null;
  private index = new Map<string, number[]>();
  constructor(private file: string) {}

  async datasetVersion() {
    return existsSync(this.file) ? `opensanctions-sanctions@${statSync(this.file).mtime.toISOString().slice(0, 10)}` : "opensanctions-not-downloaded";
  }

  private async load() {
    if (this.rows) return this.rows;
    this.rows = [];
    if (!existsSync(this.file)) return this.rows;
    const rl = readline.createInterface({ input: createReadStream(this.file, "utf8"), crlfDelay: Infinity });
    let header: string[] | null = null;
    for await (const line of rl) {
      if (!line) continue;
      const cols = parseCsvLine(line);
      if (!header) { header = cols; continue; }
      const get = (k: string) => cols[header!.indexOf(k)] ?? "";
      if (get("schema") !== "Person") continue;
      const names = [get("name"), ...get("aliases").split(";")].map((s) => s.trim()).filter(Boolean);
      const row: Row = { id: get("id"), schema: "Person", names, birthDates: get("birth_date").split(";").filter(Boolean), countries: get("countries").split(";").filter(Boolean), datasets: get("dataset").split(";").filter(Boolean), topics: ["sanction"] };
      const idx = this.rows.push(row) - 1;
      for (const n of names) for (const t of tokens(n)) { const l = this.index.get(t) ?? []; l.push(idx); this.index.set(t, l); }
    }
    return this.rows;
  }

  async match(q: ScreeningQuery): Promise<ScreeningHit[]> {
    const rows = await this.load();
    const queries = [q.name, q.nameZh].filter(Boolean) as string[];
    const scored = new Map<number, number>();
    for (const qn of queries) {
      const qt = tokens(qn);
      if (!qt.length) continue;
      const cand = new Set<number>(this.index.get(qt[0]) ?? []);
      for (const i of cand) {
        let best = 0;
        for (const n of rows[i].names) {
          const nt = new Set(tokens(n));
          if (!qt.every((t) => nt.has(t))) continue;
          best = Math.max(best, qt.length / Math.max(nt.size, qt.length));
        }
        if (best > 0) scored.set(i, Math.max(scored.get(i) ?? 0, best));
      }
    }
    return [...scored.entries()].map(([i, s]) => {
      const r = rows[i];
      let score = s;
      if (q.birthDate && r.birthDates.length && !r.birthDates.some((b) => b.slice(0, 4) === q.birthDate!.slice(0, 4))) score *= 0.6;
      return { id: r.id, caption: r.names[0], score: Math.round(score * 100) / 100, topics: r.topics, datasets: r.datasets, birthDates: r.birthDates, countries: r.countries };
    }).filter((h) => h.score >= 0.5).sort((a, b) => b.score - a.score).slice(0, 10);
  }
}
