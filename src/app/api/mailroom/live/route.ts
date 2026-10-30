import { getCtx } from "@/server/ctx";
import { mailroomVersion } from "@/mailroom/service";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ v: await mailroomVersion(getCtx()) }, { headers: { "Cache-Control": "no-store" } });
}
