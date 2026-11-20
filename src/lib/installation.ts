// Installation profiles (DECISIONS.md #65). Each client has a folder under clients/ whose
// installation.ts says which modules it runs and where its own data files are. An installation
// names its profile with INSTALLATION_PROFILE; the profile supplies defaults and the environment
// overrides them. This file is the only place in src that may import from clients/.
import { installations } from "../../clients";
import type { ModuleId } from "./modules";

export type Installation = {
  /** The client's folder name under clients/. */
  id: string;
  name: string;
  product: "clerk";
  /** Other spellings of the client's name. The boundary test keeps all of them out of core code. */
  aliases?: string[];
  modules: ModuleId[];
  /** Defaults for non-secret settings (src/lib/config.ts), file paths relative to the repository
   *  root. Secrets and machine paths stay in the environment and the secrets store. */
  settings: Record<string, string>;
};

export function installationProfile(id: string, registry: Record<string, Installation> = installations): Installation {
  const p = registry[id];
  if (!p) throw new Error(`Unknown INSTALLATION_PROFILE: ${id} (known: ${Object.keys(registry).join(", ") || "none"})`);
  return p;
}
