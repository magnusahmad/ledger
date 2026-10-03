// A small document builder on pdf-lib: headings, wrapped paragraphs (CJK-aware), tables and
// signature blocks. Deterministic and dependency-light (no headless browser in the worker).
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { embedFonts, type Fonts } from "./fonts";

export type Block =
  | { t: "title"; text: string }
  | { t: "subtitle"; text: string }
  | { t: "h"; text: string }
  | { t: "p"; text: string; indent?: number }
  | { t: "list"; items: string[]; numbered?: boolean }
  | { t: "table"; head: string[]; rows: string[][]; widths?: number[] }
  | { t: "sign"; names: { name: string; caption: string; field?: string }[] }
  | { t: "space"; h?: number }
  | { t: "small"; text: string }
  | { t: "pagebreak" };

export type BuiltDoc = { pdf: Buffer; text: string; signatureFields: { field: string; page: number; x: number; y: number; w: number; h: number }[] };

const W = 595, H = 842, M = 64;
const INK = rgb(0.086, 0.094, 0.114), MUTED = rgb(0.42, 0.45, 0.5), LINE = rgb(0.83, 0.84, 0.87);

export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    // Break on spaces for Latin text, anywhere for CJK characters.
    const tokens = para.match(/[⺀-鿿＀-￯]|[^\s⺀-鿿＀-￯]+|\s+/g) ?? [""];
    const bounded = tokens.flatMap(tok => {
      if (font.widthOfTextAtSize(tok, size) <= width) return [tok];
      const pieces: string[] = [];
      let part = "";
      for (const char of tok) {
        if (part && font.widthOfTextAtSize(part + char, size) > width) { pieces.push(part); part = ""; }
        part += char;
      }
      if (part) pieces.push(part);
      return pieces;
    });
    for (const tok of bounded) {
      const next = line + tok;
      if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
      else { out.push(line.trimEnd()); line = tok.trimStart(); }
    }
    out.push(line.trimEnd());
  }
  return out;
}

export async function buildPdf(blocks: Block[], opts: { lang?: "en" | "tc" | "sc" | "bilingual"; header?: string; footer?: string } = {}): Promise<BuiltDoc> {
  const doc = await PDFDocument.create();
  const fonts: Fonts = await embedFonts(doc, opts.lang ?? "tc", { text: JSON.stringify(blocks) + (opts.header ?? "") + (opts.footer ?? "") });
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const text: string[] = [];
  const signatureFields: BuiltDoc["signatureFields"] = [];
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; if (opts.header) drawHeader(); };
  const need = (h: number) => { if (y - h < M + 20) newPage(); };
  const draw = (s: string, x: number, size: number, bold = false, color = INK) => { page.drawText(s, { x, y, size, font: fonts.pick(s, bold), color }); };
  const drawHeader = () => {
    if (!opts.header) return;
    const lines = wrap(opts.header, fonts.pick(opts.header), 8, W - 2 * M);
    lines.forEach((line, i) => page.drawText(line, { x: M, y: H - 36 - i * 11, size: 8, font: fonts.pick(line), color: MUTED }));
    y = Math.min(y, H - 36 - lines.length * 11 - 12);
  };
  drawHeader();

  for (const b of blocks) {
    switch (b.t) {
      case "title": { const lines = wrap(b.text, fonts.pick(b.text, true), 15, W - 2 * M); for (const l of lines) { need(20); draw(l, M, 15, true); y -= 20; } y -= 6; text.push(b.text); break; }
      case "subtitle": { const lines = wrap(b.text, fonts.pick(b.text), 11, W - 2 * M); for (const l of lines) { need(15); draw(l, M, 11, false, MUTED); y -= 15; } y -= 8; text.push(b.text); break; }
      case "h": { y -= 4; for (const l of wrap(b.text, fonts.pick(b.text, true), 11.5, W - 2 * M)) { need(18); draw(l, M, 11.5, true); y -= 18; } text.push(b.text); break; }
      case "p": case "small": {
        const size = b.t === "small" ? 8.5 : 10.5, lh = b.t === "small" ? 12 : 15, indent = b.t === "p" ? b.indent ?? 0 : 0;
        const lines = wrap(b.text, fonts.pick(b.text), size, W - 2 * M - indent);
        for (const l of lines) { need(lh); draw(l, M + indent, size, false, b.t === "small" ? MUTED : INK); y -= lh; }
        y -= 6; text.push(b.text); break;
      }
      case "list": b.items.forEach((it, i) => {
        const lines = wrap(it, fonts.pick(it), 10.5, W - 2 * M - 22);
        lines.forEach((l, j) => { need(15); if (j === 0) draw(b.numbered ? `${i + 1}.` : "•", M + 4, 10.5); draw(l, M + 22, 10.5); y -= 15; });
        y -= 3; text.push(it);
      }); y -= 4; break;
      case "table": {
        const cols = b.head.length, widths = b.widths ?? Array(cols).fill((W - 2 * M) / cols);
        const row = (cells: string[], bold: boolean) => {
          const wrapped = cells.map((c, i) => wrap(c ?? "", fonts.pick(c ?? "", bold), 9.5, widths[i] - 8));
          const count = Math.max(...wrapped.map(w => w.length));
          for (let j = 0; j < count; j++) {
            if (y - 19 < M + 20) {
              newPage();
              // Keep the column meanings visible on continuation pages.
              if (!bold) row(b.head, true);
            }
            let x = M;
            wrapped.forEach((lines, i) => { if (lines[j] !== undefined) page.drawText(lines[j], { x: x + 4, y: y - 11, size: 9.5, font: fonts.pick(lines[j], bold), color: INK }); x += widths[i]; });
            y -= 13;
          }
          y -= 6;
          page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: LINE });
          text.push(cells.join(" | "));
        };
        page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: LINE });
        row(b.head, true);
        for (const r of b.rows) row(r, false);
        y -= 10; break;
      }
      case "sign": {
        for (const s of b.names) {
          const names = wrap(s.name, fonts.pick(s.name, true), 10, 220), captions = wrap(s.caption, fonts.pick(s.caption), 9, 220);
          need(52 + names.length * 14 + captions.length * 13); y -= 34;
          page.drawLine({ start: { x: M, y }, end: { x: M + 220, y }, thickness: 0.8, color: INK });
          if (s.field) signatureFields.push({ field: s.field, page: doc.getPageCount() - 1, x: M, y: y + 2, w: 220, h: 30 });
          for (const l of names) { y -= 14; need(14); draw(l, M, 10, true); }
          for (const l of captions) { y -= 13; need(13); draw(l, M, 9, false, MUTED); }
          y -= 8;
          text.push(`${s.name} ${s.caption}`);
        }
        break;
      }
      case "space": y -= b.h ?? 12; break;
      case "pagebreak": newPage(); break;
    }
  }
  if (opts.footer) doc.getPages().forEach((p, i, all) => {
    const lines = wrap(`${opts.footer}  ·  ${i + 1}/${all.length}`, fonts.pick(opts.footer!), 7.5, W - 2 * M);
    lines.forEach((line, j) => p.drawText(line, { x: M, y: 30 + (lines.length - 1 - j) * 10, size: 7.5, font: fonts.pick(line), color: MUTED }));
  });
  return { pdf: Buffer.from(await doc.save()), text: text.join("\n"), signatureFields };
}
