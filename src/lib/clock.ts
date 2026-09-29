// Clock behind an interface so deadline and ageing rules are testable.
export interface Clock {
  now(): Date;
  /** Today's date in Hong Kong (UTC+8) as YYYY-MM-DD. */
  today(): string;
}

export function hkDate(d: Date): string {
  return new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

export const systemClock: Clock = { now: () => new Date(), today: () => hkDate(new Date()) };

export class FixedClock implements Clock {
  constructor(private t: Date) {}
  now() { return new Date(this.t); }
  today() { return hkDate(this.t); }
  set(iso: string) { this.t = new Date(iso); }
  advanceDays(n: number) { this.t = new Date(this.t.getTime() + n * 86400_000); }
  advanceSeconds(n: number) { this.t = new Date(this.t.getTime() + n * 1000); }
}
