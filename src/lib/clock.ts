// Clock behind an interface so deadline and ageing rules are testable.
export interface Clock {
  now(): Date;
  /** Today's date in Hong Kong (UTC+8) as YYYY-MM-DD. */
  today(): string;
  /** Demo clock: shift "now" by whole days (see domain/demo-clock). */
  setOffsetDays?(days: number): void;
}

export function hkDate(d: Date): string {
  return new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

export const systemClock: Clock = { now: () => new Date(), today: () => hkDate(new Date()) };

/** The real clock plus a demo offset, shared by every context in a process. */
export class OffsetClock implements Clock {
  private offsetMs = 0;
  now() { return new Date(Date.now() + this.offsetMs); }
  today() { return hkDate(this.now()); }
  setOffsetDays(days: number) { this.offsetMs = days * 86400_000; }
}

export class FixedClock implements Clock {
  private offsetMs = 0;
  constructor(private t: Date) {}
  now() { return new Date(this.t.getTime() + this.offsetMs); }
  setOffsetDays(days: number) { this.offsetMs = days * 86400_000; }
  today() { return hkDate(this.now()); }
  set(iso: string) { this.t = new Date(iso); }
  advanceDays(n: number) { this.t = new Date(this.t.getTime() + n * 86400_000); }
  advanceSeconds(n: number) { this.t = new Date(this.t.getTime() + n * 1000); }
}
