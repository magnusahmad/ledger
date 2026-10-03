// Tiny JSON-file store so fake adapters work across the web and worker processes in
// offline demo mode. Tests use the in-memory variant.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface ListStore<T> { readonly identity?: string; all(): T[]; push(item: T): void; }

export class MemoryList<T> implements ListStore<T> {
  readonly identity = `memory:${randomUUID()}`;
  items: T[] = [];
  all() { return [...this.items]; }
  push(item: T) { this.items.push(item); }
}

export class FileList<T> implements ListStore<T> {
  readonly identity: string;
  constructor(private file: string) { this.identity = `file:${path.resolve(file)}`; }
  all(): T[] {
    if (!existsSync(this.file)) return [];
    return JSON.parse(readFileSync(this.file, "utf8")) as T[];
  }
  push(item: T) {
    const items = this.all();
    items.push(item);
    mkdirSync(path.dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(items, null, 2));
  }
}
