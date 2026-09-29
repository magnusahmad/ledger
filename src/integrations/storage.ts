import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Storage } from "./types";

export class DiskStorage implements Storage {
  constructor(private root: string) {}
  private p(key: string) {
    const clean = key.replace(/\.\.+/g, ".").replace(/^\/+/, "");
    return path.join(this.root, clean);
  }
  async put(key: string, content: Buffer) {
    const file = this.p(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  async get(key: string) { return readFile(this.p(key)); }
}

export class MemoryStorage implements Storage {
  files = new Map<string, Buffer>();
  async put(key: string, content: Buffer) { this.files.set(key, content); }
  async get(key: string) {
    const f = this.files.get(key);
    if (!f) throw new Error(`No such file: ${key}`);
    return f;
  }
}
