// Splitting a batch scan into letters. The model proposes page ranges; they are used only
// when they cover every page exactly once, otherwise the whole scan is one letter for staff.
import { PDFDocument } from "pdf-lib";

export type PageRange = { fromPage: number; toPage: number };

export function splitPlan(pages: number, ranges: PageRange[]): PageRange[] {
  const whole = [{ fromPage: 1, toPage: pages }];
  const sorted = [...ranges].sort((a, b) => a.fromPage - b.fromPage);
  let next = 1;
  for (const r of sorted) {
    if (!Number.isInteger(r.fromPage) || !Number.isInteger(r.toPage) || r.fromPage !== next || r.toPage < r.fromPage) return whole;
    next = r.toPage + 1;
  }
  return next === pages + 1 ? sorted.map(({ fromPage, toPage }) => ({ fromPage, toPage })) : whole;
}

export async function pdfPages(content: Buffer): Promise<number> {
  return (await PDFDocument.load(content, { ignoreEncryption: true })).getPageCount();
}

export async function extractPages(content: Buffer, r: PageRange): Promise<Buffer> {
  const src = await PDFDocument.load(content, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const fixed = src.getCreationDate() ?? new Date(0);
  out.setCreationDate(fixed);
  out.setModificationDate(fixed);
  const pages = await out.copyPages(src, Array.from({ length: r.toPage - r.fromPage + 1 }, (_, i) => r.fromPage - 1 + i));
  pages.forEach((p) => out.addPage(p));
  return Buffer.from(await out.save());
}

/** A photo of a letter becomes a one-page PDF so every letter is filed as a PDF. */
export async function imageToPdf(content: Buffer, mime: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const img = mime === "image/png" ? await doc.embedPng(content) : await doc.embedJpg(content);
  const page = doc.addPage([img.width, img.height]);
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  return Buffer.from(await doc.save());
}
