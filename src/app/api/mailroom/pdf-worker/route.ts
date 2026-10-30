// pdf.js's worker, served from the installed package so scans render without a CDN.
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function GET() {
  const js = await readFile(path.join(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"));
  return new Response(new Uint8Array(js), { headers: { "Content-Type": "text/javascript", "Cache-Control": "public, max-age=86400" } });
}
