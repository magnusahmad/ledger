// All controller writers use the same dated interval and firm checks.
import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/ctx";
import { significantController } from "@/db/schema";
import { isIsoDate } from "./dates";
import { preserveRegisterBaselines } from "./register-person";

export async function addController(ctx: Ctx, input: { clientId: string; personId: string; nature: string; registrableFrom: string; sourceTaskId: string }) {
  if (!isIsoDate(input.registrableFrom) || !input.nature.trim()) throw new Error("Confirm the controller's nature and valid registration date");
  return ctx.db.transaction(async db => {
    const txCtx = { ...ctx, db: db as unknown as Ctx["db"] };
    await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`shares:${ctx.firmId}:${input.clientId}`}, 0))`);
    await preserveRegisterBaselines(txCtx, input.personId, input.clientId);
    const overlap = await db.query.significantController.findFirst({ where: and(eq(significantController.firmId, ctx.firmId), eq(significantController.clientId, input.clientId), eq(significantController.personId, input.personId), or(isNull(significantController.ceasedOn), gt(significantController.ceasedOn, input.registrableFrom))) });
    if (overlap) throw new Error("This controller period overlaps existing history; explicitly review or cease it before changing its nature");
    const [row] = await db.insert(significantController).values({ id: ctx.ids.next("scr"), firmId: ctx.firmId, ...input }).returning();
    return row;
  });
}

export async function ceaseController(ctx: Ctx, clientId: string, id: string, date: string) {
  if (!isIsoDate(date)) throw new Error("Confirm a valid controller cessation date");
  return ctx.db.transaction(async db => {
    await db.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`shares:${ctx.firmId}:${clientId}`}, 0))`);
    const [row] = await db.select().from(significantController).where(and(eq(significantController.firmId, ctx.firmId), eq(significantController.clientId, clientId), eq(significantController.id, id))).for("update");
    if (!row || row.ceasedOn || date <= row.registrableFrom) throw new Error("Controller cessation requires an active period and a later valid date; recorded cessation needs separately reviewed correction");
    await db.update(significantController).set({ ceasedOn: date }).where(and(eq(significantController.id, id), eq(significantController.firmId, ctx.firmId)));
  });
}
