// Fonts with CJK coverage for generated PDFs. Noto Sans TC (Hong Kong glyph shapes) is the
// default; text containing characters TC lacks (some Simplified forms) falls back to Noto Sans SC.
import { readFileSync } from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { StandardFonts, type PDFDocument, type PDFFont } from "pdf-lib";

const DIR = path.join(process.cwd(), "assets/fonts");
const cache = new Map<string, Buffer>();
const file = (n: string) => { if (!cache.has(n)) cache.set(n, readFileSync(path.join(DIR, n))); return cache.get(n)!; };

export type Fonts = { regular: PDFFont; bold: PDFFont; pick: (text: string, bold?: boolean) => PDFFont };

export async function embedFonts(doc: PDFDocument, lang: "en" | "tc" | "sc" | "bilingual" = "tc", opts: { text?: string; bold?: boolean; features?: NonNullable<Parameters<PDFDocument["embedFont"]>[1]>["features"] } = {}): Promise<Fonts> {
  if (opts.text !== undefined && /^[\x00-\x7F]*$/.test(opts.text)) {
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = opts.bold === false ? regular : await doc.embedFont(StandardFonts.HelveticaBold);
    return { regular, bold, pick: (_text, b = false) => b ? bold : regular };
  }
  doc.registerFontkit(fontkit);
  // Localized numeric substitutions in these intact Noto fonts are missing
  // from pdf-lib's Unicode/width maps. Use their mapped glyphs for exact search,
  // copy and the same measured/rendered widths; TC/SC shapes come from the font.
  const features = { locl: false, ...opts.features };
  const primary = lang === "sc" ? "SC" : "TC";
  const other = primary === "TC" ? "SC" : "TC";
  // fontkit subsetting corrupts glyf outlines in these bundled fonts: PDF text
  // remains searchable but characters vanish when rendered. Embed intact fonts.
  const regular = await doc.embedFont(file(`NotoSans${primary}-Regular.ttf`), { subset: false, features });
  const bold = opts.bold === false ? regular : await doc.embedFont(file(`NotoSans${primary}-Bold.ttf`), { subset: false, features });
  let fbR: PDFFont | null = null, fbB: PDFFont | null = null;
  const primarySet = new Set(regular.getCharacterSet());
  const fallback = async () => {
    fbR ??= await doc.embedFont(file(`NotoSans${other}-Regular.ttf`), { subset: false, features });
    fbB ??= opts.bold === false ? fbR : await doc.embedFont(file(`NotoSans${other}-Bold.ttf`), { subset: false, features });
  };
  if (opts.text === undefined || [...opts.text].some(ch => !primarySet.has(ch.codePointAt(0)!))) await fallback();
  return {
    regular, bold,
    pick: (text, b = false) => {
      for (const ch of text) if (ch.charCodeAt(0) > 0x2e7f && !primarySet.has(ch.codePointAt(0)!)) return b ? fbB! : fbR!;
      return b ? bold : regular;
    },
  };
}
