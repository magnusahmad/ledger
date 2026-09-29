// Minimal PDF for placeholder documents (seed data, demo uploads).
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function simplePdf(title: string, lines: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText(title, { x: 56, y: 780, size: 16, font: bold, color: rgb(0.09, 0.09, 0.11) });
  let y = 750;
  for (const l of lines) {
    page.drawText(l.replace(/[^\x20-\x7E]/g, "?"), { x: 56, y, size: 11, font });
    y -= 18;
  }
  return Buffer.from(await doc.save());
}
