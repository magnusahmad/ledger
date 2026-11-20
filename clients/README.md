# Client layer

Clerk is one core product. Each firm it is deployed for has a folder here holding everything that is specific to that firm. The core (`src/`) never names a client and never imports from this folder, except through the loader in `src/lib/installation.ts`. Decision: `docs/DECISIONS.md` #65.

To find out what is bespoke for a client, read its folder. Start with its `README.md`.

## Where a change for a client goes

Take the first that fits.

1. **Config and data.** Playbooks, message templates, filing rules, column mappings, which modules are on. Put it in `clients/<id>/data/` and name it in `installation.ts`. No core code changes.
2. **Client code.** A reader, script or check only this client needs. Put it in `clients/<id>/src/` or `ops/`, with its tests in `clients/<id>/tests/`. It may import the core (`@/...`); the core may not import it.
3. **Core change.** Anything a second client would want. Build it in `src/` and switch it per installation with a setting. If the core needs something from the client at run time, add an interface in the core and give it an adapter (see `src/annual/records.ts`).

A fork or long-lived client branch is an exception: it needs a written date for merging back.

## Folder layout

```
clients/<id>/
  README.md         what this client runs and what is bespoke
  installation.ts   the profile: modules and non-secret settings
  data/             the client's own rules, templates and mappings
  src/              code only this client needs
  ops/              install, discovery and maintenance scripts
  docs/             pilot plan, briefs, deployment notes
  tests/            tests for everything above
```

## Installation profile

`installation.ts` exports an `Installation` (`src/lib/installation.ts`): the client's `id` (the folder name), `name`, `aliases`, `modules`, and `settings`, which are defaults for the non-secret settings in `src/lib/config.ts`. File paths are relative to the repository root.

An installation names its client with `INSTALLATION_PROFILE=<id>`. The profile supplies defaults; anything set in the environment overrides it. Secrets and machine paths are never in a profile: they are set on the machine.

## Adding a client

1. Create `clients/<id>/installation.ts` and list it in `clients/index.ts`.
2. Add its data files under `data/` and name them in `settings`.
3. Add `clients/<id>/tests/installation.test.ts` showing that the installation loads the right modules and passes the production guard.
4. Write `README.md`.

## Rules the tests enforce

`tests/client-layer.test.ts` fails when:

- a client id or alias appears in `src/` outside a comment;
- anything in `src/` other than `src/lib/installation.ts` imports from `clients/`;
- a client folder has no profile, or the profile's `id` differs from the folder name;
- a profile holds a secret, or names a data file that does not exist.

Client tests run with the rest of the suite (`npm test`).

## Which build a client is on

`npm run build:stamp` writes `build.json` (commit, branch, uncommitted changes, version, latest migration). It runs before every `npm run build`. On a machine without git, the copy keeps the stamp it came with, so stamp before copying.

A running installation reports its build at `/api/health`, with its client profile, modules, model and prompt version. To answer a query about a client, check out the commit it reports and read `clients/<id>/`.

Never put client data, personal data or credentials in this folder.
