// AES-256-GCM for protected information (ID numbers, residential addresses) and
// integration secrets. Keys derive from APP_SECRET; ciphertext is never sent to the UI.
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export class Crypto {
  private key: Buffer;
  constructor(secret: string) {
    this.key = createHash("sha256").update("harbourline:" + secret).digest();
  }
  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const c = createCipheriv("aes-256-gcm", this.key, iv);
    const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
    return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(".");
  }
  decrypt(enc: string): string {
    const [v, iv, tag, ct] = enc.split(".");
    if (v !== "v1") throw new Error("Unknown ciphertext version");
    const d = createDecipheriv("aes-256-gcm", this.key, Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
  }
  static sha256(data: string | Buffer): string {
    return createHash("sha256").update(data).digest("hex");
  }
  static safeEqualHex(a: string, b: string): boolean {
    const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
    return x.length === y.length && timingSafeEqual(x, y);
  }
}

/** Mask all but the last 4 characters, e.g. for ID numbers in the UI. */
export function mask(value: string | null | undefined, keep = 4): string | null {
  if (!value) return null;
  return value.length <= keep ? "•".repeat(value.length) : "•".repeat(Math.max(4, value.length - keep)) + value.slice(-keep);
}
