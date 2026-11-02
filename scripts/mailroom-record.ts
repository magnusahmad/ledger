// Runs the fictional letter pack through the live model once and saves the answers as
// replayable recordings (seed/mailroom/recordings), so the demo works offline. Fictional data only.
import { readFileSync } from "node:fs";
import path from "node:path";
import { closePools } from "@/db/client";
import { makeRuntimeCtx } from "@/lib/runtime";
import { makeMailroom } from "@/mailroom/runtime";
import { chooseClient, ingestScan, lettersFor, processBatch } from "@/mailroom/service";

async function main() {
  const ctx = makeRuntimeCtx();
  if (ctx.config.llmMode !== "live") throw new Error("Recording needs the live model (or_api_key)");
  const mr = makeMailroom(ctx);
  // Default: the 12-letter pack. Pass another fictional scan (e.g. the specimen) to record that.
  const file = process.argv[2] ?? "demos/cwccpa/letter-pack.pdf";
  const content = readFileSync(path.join(process.cwd(), file));
  // Run after mailroom:reset: the exact pack bytes are the recording key.
  const b = await ingestScan(ctx, mr, { filename: path.basename(file), content });
  if (!b) throw new Error("The pack is already in the mail room. Run npm run mailroom:reset first.");
  await processBatch(ctx, mr, b.id);
  // Also record the email for each client staff might pick on an unclear letter. Run mailroom:reset afterwards.
  for (const l of await lettersFor(ctx, b.id)) for (const c of l.candidates) await chooseClient(ctx, mr, l.id, c.id);
  for (const l of await lettersFor(ctx, b.id)) console.log(l.seq, `${l.pageFrom}-${l.pageTo}`, l.status, l.matchKind, l.client?.name ?? l.candidates.map((c) => c.name).join(" / "), "|", l.read?.type, "|", l.folder, "|", l.fileName, l.error ?? "");
  await closePools();
}
main().catch((e) => { console.error(e); process.exit(1); });
