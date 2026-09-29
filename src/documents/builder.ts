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

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    // Break on spaces for Latin text, anywhere for CJK characters.
    const tokens = para.match(/[⺀-鿿＀-￯]|[^\s⺀-鿿＀-￯]+|\s+/g) ?? [""];
    for (const tok of tokens) {
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
  const fonts: Fonts = await embedFonts(doc, opts.lang ?? "tc");
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const text: string[] = [];
  const signatureFields: BuiltDoc["signatureFields"] = [];
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; if (opts.header) drawHeader(); };
  const need = (h: number) => { if (y - h < M + 20) newPage(); };
  const draw = (s: string, x: number, size: number, bold = false, color = INK) => { page.drawText(s, { x, y, size, font: fonts.pick(s, bold), color }); };
  const drawHeader = () => { if (!opts.header) return; page.drawText(opts.header, { x: M, y: H - 36, size: 8, font: fonts.pick(opts.header), color: MUTED }); };
  drawHeader();

  for (const b of blocks) {
    switch (b.t) {
      case "title": { const lines = wrap(b.text, fonts.bold, 15, W - 2 * M); need(lines.length * 20 + 6); for (const l of lines) { draw(l, M, 15, true); y -= 20; } y -= 6; text.push(b.text); break; }
      case "subtitle": { const lines = wrap(b.text, fonts.regular, 11, W - 2 * M); need(lines.length * 15); for (const l of lines) { draw(l, M, 11, false, MUTED); y -= 15; } y -= 8; text.push(b.text); break; }
      case "h": { need(24); y -= 4; draw(b.text, M, 11.5, true); y -= 18; text.push(b.text); break; }
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
          const h = Math.max(...wrapped.map((w) => w.length)) * 13 + 6;
          need(h);
          let x = M;
          wrapped.forEach((lines, i) => { lines.forEach((l, j) => page.drawText(l, { x: x + 4, y: y - 11 - j * 13, size: 9.5, font: fonts.pick(l, bold), color: INK })); x += widths[i]; });
          y -= h;
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
          need(70); y -= 34;
          page.drawLine({ start: { x: M, y }, end: { x: M + 220, y }, thickness: 0.8, color: INK });
          if (s.field) signatureFields.push({ field: s.field, page: doc.getPageCount() - 1, x: M, y: y + 2, w: 220, h: 30 });
          y -= 14; draw(s.name, M, 10, true); y -= 13; draw(s.caption, M, 9, false, MUTED); y -= 8;
          text.push(`${s.name} ${s.caption}`);
        }
        break;
      }
      case "space": y -= b.h ?? 12; break;
      case "pagebreak": newPage(); break;
    }
  }
  if (opts.footer) doc.getPages().forEach((p, i, all) => p.drawText(`${opts.footer}  ·  ${i + 1}/${all.length}`, { x: M, y: 30, size: 7.5, font: fonts.pick(opts.footer!), color: MUTED }));
  return { pdf: Buffer.from(await doc.save()), text: text.join("\n"), signatureFields };
}
