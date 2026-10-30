// Mail room helpers for pages and actions.
import "server-only";
import { getCtx } from "./ctx";
import { makeMailroom } from "@/mailroom/runtime";

export function getMailroom() {
  const ctx = getCtx();
  return { ctx, mr: makeMailroom(ctx) };
}
