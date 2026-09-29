// OpenSanctions hosted API (/match/default), used when OPENSANCTIONS_API_KEY is set.
// Covers sanctions and PEPs.
import type { ScreeningHit, ScreeningProvider, ScreeningQuery } from "../types";

export class OpenSanctionsApi implements ScreeningProvider {
  readonly name = "opensanctions-api";
  constructor(private apiKey: string, private f: typeof fetch = fetch) {}
  async datasetVersion() { return "opensanctions-api/default"; }
  async match(q: ScreeningQuery): Promise<ScreeningHit[]> {
    const properties: Record<string, string[]> = { name: [q.name, ...(q.nameZh ? [q.nameZh] : [])] };
    if (q.birthDate) properties.birthDate = [q.birthDate];
    if (q.nationality) properties.nationality = [q.nationality];
    const r = await this.f("https://api.opensanctions.org/match/default?algorithm=logic-v1", {
      method: "POST", headers: { Authorization: `ApiKey ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ queries: { q: { schema: "Person", properties } } }),
    });
    if (!r.ok) throw new Error(`OpenSanctions ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json() as { responses: { q: { results: { id: string; caption: string; score: number; datasets: string[]; properties: Record<string, string[]> }[] } } };
    return j.responses.q.results.filter((x) => x.score >= 0.5).map((x) => ({ id: x.id, caption: x.caption, score: x.score, datasets: x.datasets, topics: x.properties.topics ?? [], birthDates: x.properties.birthDate, countries: x.properties.country }));
  }
}
