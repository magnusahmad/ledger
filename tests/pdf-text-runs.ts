// Inspect actual saved PDF text operators and embedded CID widths, independently
// of the production layout helper. Generated certificate fonts use Identity-H.
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export async function pdfTextRuns(bytes: Buffer, firstPage = 0) {
  const pdf = await PDFDocument.load(bytes);
  const out: { page: number; text: string; x: number; y: number; width: number }[] = [];
  const cache = new Map<PDFDict, { widths: Map<number, number>; characters: Map<number, string>; defaultWidth: number }>();
  for (const [index, page] of pdf.getPages().entries()) {
    if (index < firstPage) continue;
    const resources = page.node.Resources()!.lookup(PDFName.of("Font"), PDFDict);
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray().map(ref => pdf.context.lookup(ref) as PDFRawStream) : [contents as PDFRawStream];
    for (const stream of streams) {
      const operators = Buffer.from(decodePDFRawStream(stream).decode()).toString();
      for (const match of operators.matchAll(/\/([^\s]+) ([\d.]+) Tf[\s\S]*?1 0 0 1 ([\d.-]+) ([\d.-]+) Tm\s*<([\da-f]+)> Tj/gi)) {
        const font = resources.lookup(PDFName.of(match[1]), PDFDict);
        let data = cache.get(font);
        if (!data) {
          const descendant = font.lookup(PDFName.of("DescendantFonts"), PDFArray).lookup(0, PDFDict);
          const widths = descendant.lookup(PDFName.of("W"), PDFArray);
          const widthMap = new Map<number, number>();
          for (let i = 0; i < widths.size();) {
            const start = widths.lookup(i++, PDFNumber).asNumber();
            const next = widths.lookup(i++);
            if (next instanceof PDFArray) next.asArray().forEach((w, offset) => widthMap.set(start + offset, (w as PDFNumber).asNumber()));
            else {
              const end = (next as PDFNumber).asNumber();
              const width = widths.lookup(i++, PDFNumber).asNumber();
              for (let id = start; id <= end; id++) widthMap.set(id, width);
            }
          }
          const cmap = Buffer.from(decodePDFRawStream(font.lookup(PDFName.of("ToUnicode")) as PDFRawStream).decode()).toString();
          const characters = new Map<number, string>();
          for (const [, from, to] of cmap.matchAll(/<([\da-f]{4})>\s+<([\da-f]+)>/gi)) characters.set(parseInt(from, 16), String.fromCharCode(...(to.match(/.{4}/g) ?? []).map(hex => parseInt(hex, 16))));
          // Noto's shaping substitutes numeric glyphs not listed in its Unicode
          // cmap. Decode those using the actual embedded font, not a source font.
          const descriptor = descendant.lookup(PDFName.of("FontDescriptor"), PDFDict);
          const embedded = fontkit.create(Buffer.from(decodePDFRawStream(descriptor.lookup(PDFName.of("FontFile2")) as PDFRawStream).decode()));
          for (const glyph of embedded.layout("a0123456789").glyphs) if (glyph.codePoints.length === 1) characters.set(glyph.id, String.fromCodePoint(glyph.codePoints[0]));
          const defaultWidth = descendant.lookupMaybe(PDFName.of("DW"), PDFNumber)?.asNumber() ?? 1000;
          data = { widths: widthMap, characters, defaultWidth }; cache.set(font, data);
        }
        const glyphs = (match[5].match(/.{4}/g) ?? []).map(hex => parseInt(hex, 16));
        out.push({ page: index, text: glyphs.map(id => data.characters.get(id) ?? "").join(""), x: Number(match[3]), y: Number(match[4]), width: glyphs.reduce((sum, id) => sum + (data.widths.get(id) ?? data.defaultWidth), 0) * Number(match[2]) / 1000 });
      }
    }
  }
  return { pdf, runs: out };
}
