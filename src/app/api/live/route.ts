import { getCtx } from "@/server/ctx";
import { liveVersion } from "@/server/queries";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ v: await liveVersion(getCtx()) }, { headers: { "Cache-Control": "no-store" } });
}
