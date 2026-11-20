// The registry of client installations. Add a client by creating clients/<id>/installation.ts and
// listing it here; core code reaches it only through src/lib/installation.ts.
import type { Installation } from "../src/lib/installation";
import cwccpa from "./cwccpa/installation";
import uhy from "./uhy/installation";

export const installations: Record<string, Installation> = { cwccpa, uhy };
