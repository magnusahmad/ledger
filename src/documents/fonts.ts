// Fonts with CJK coverage for generated PDFs. Noto Sans TC (Hong Kong glyph shapes) is the
// default; text containing characters TC lacks (some Simplified forms) falls back to Noto Sans SC.
import { readFileSync } from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";

const DIR = path.join(process.cwd(), "assets/fonts");
const cache = new Map<string, Buffer>();
const file = (n: string) => { if (!cache.has(n)) cache.set(n, readFileSync(path.join(DIR, n))); return cache.get(n)!; };

export type Fonts = { regular: PDFFont; bold: PDFFont; pick: (text: string, bold?: boolean) => PDFFont };

export async function embedFonts(doc: PDFDocument, lang: "en" | "tc" | "sc" | "bilingual" = "tc"): Promise<Fonts> {
  doc.registerFontkit(fontkit);
  const primary = lang === "sc" ? "SC" : "TC";
  const other = primary === "TC" ? "SC" : "TC";
  const regular = await doc.embedFont(file(`NotoSans${primary}-Regular.ttf`), { subset: true });
  const bold = await doc.embedFont(file(`NotoSans${primary}-Bold.ttf`), { subset: true });
  let fbR: PDFFont | null = null, fbB: PDFFont | null = null;
  const primarySet = new Set(regular.getCharacterSet());
  const fallback = async () => {
    fbR ??= await doc.embedFont(file(`NotoSans${other}-Regular.ttf`), { subset: true });
    fbB ??= await doc.embedFont(file(`NotoSans${other}-Bold.ttf`), { subset: true });
  };
  await fallback();
  return {
    regular, bold,
    pick: (text, b = false) => {
      for (const ch of text) if (ch.charCodeAt(0) > 0x2e7f && !primarySet.has(ch.codePointAt(0)!)) return b ? fbB! : fbR!;
      return b ? bold : regular;
    },
  };
}
