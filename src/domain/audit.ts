import type { Ctx } from "@/lib/ctx";
import { auditLog } from "@/db/schema";

export async function audit(ctx: Ctx, action: string, entity: string, entityId: string | null, data: Record<string, unknown> = {}, actor = ctx.userId) {
  await ctx.db.insert(auditLog).values({ id: ctx.ids.next("aud"), firmId: ctx.firmId, actor, action, entity, entityId, data, at: ctx.clock.now() });
}
