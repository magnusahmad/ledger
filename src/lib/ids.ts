import { customAlphabet } from "nanoid";

const alpha = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);
export interface Ids { next(prefix: string): string; token(): string }
export const randomIds: Ids = {
  next: (prefix) => `${prefix}_${alpha()}`,
  token: () => customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", 32)(),
};
export class SeqIds implements Ids {
  private n = 0;
  next(prefix: string) { return `${prefix}_${String(++this.n).padStart(6, "0")}`; }
  token() { return `tok${String(++this.n).padStart(29, "0")}`; }
}
