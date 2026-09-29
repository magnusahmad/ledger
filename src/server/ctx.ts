// Server-side context for pages, server actions and route handlers. Importing the domain
// entry point registers every step hook, approval handler and job handler.
import "server-only";
import "@/domain/inbound";
import { makeRuntimeCtx } from "@/lib/runtime";
import type { Ctx } from "@/lib/ctx";

export function getCtx(): Ctx {
  return makeRuntimeCtx();
}
