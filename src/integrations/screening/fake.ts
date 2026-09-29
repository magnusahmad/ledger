import type { ScreeningHit, ScreeningProvider, ScreeningQuery } from "../types";

/** Returns preset hits for names in the watch map; everyone else is clear. */
export class FakeScreening implements ScreeningProvider {
  readonly name = "fake";
  constructor(private watch: Record<string, ScreeningHit[]> = {}) {}
  async datasetVersion() { return "fake-2026-09-29"; }
  async match(q: ScreeningQuery) { return this.watch[q.name.toUpperCase()] ?? []; }
}
