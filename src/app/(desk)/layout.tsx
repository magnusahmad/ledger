import { Shell } from "@/components/Shell";
import { getCtx } from "@/server/ctx";
import { clientNames, navCounts } from "@/server/queries";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const ctx = getCtx();
  const [counts, clients] = await Promise.all([navCounts(ctx), clientNames(ctx)]);
  return <Shell counts={counts} clients={clients}>{children}</Shell>;
}
