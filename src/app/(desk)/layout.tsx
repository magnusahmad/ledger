import { Shell } from "@/components/Shell";
import { getCtx } from "@/server/ctx";
import { navCounts } from "@/server/queries";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const ctx = getCtx();
  const counts = await navCounts(ctx);
  return <Shell counts={counts}>{children}</Shell>;
}
