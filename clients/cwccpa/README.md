# CWCCPA

The mail room for CWCCPA's inbound post (`docs/DECISIONS.md` #57, #58): a copier's scan folder is watched, each batch is split into letters, the model reads each letter, staff review, and the letter is filed into the firm's own client folders with a draft email to the client. Company-level context is in the CRV knowledge base, `research/targets/cwccpa.md`.

Not deployed yet. The profile and data below are what the installation will run on.

## What it runs

- **Modules:** `mailroom` only.
- **Profile:** `installation.ts` (firm id, firm name, the two data files below).
- **Record of truth:** CWCCPA's own client folders and mailbox. The mail room keeps a read-only copy of the client list, synced from the firm's records (#58).

## What is bespoke

| Where | What |
|---|---|
| `data/rules.json` | Folder and file naming on CWCCPA's X: drive: `CWCHK Client Folder/<client>`, with tax letters in the client's `<code>-Tax Folder` |
| `data/client-sources.json` | Where its client list comes from: the Excel list under `Admin` and the client folders, matched on its client codes (such as `FL1401A1`) |

There is no client-only code.

## Still to set before deployment

- **Sender address** (`MAILROOM_FROM`). A production installation refuses to start until it is set.
- **Machine settings:** the scan folder, the server root and where drafts go (`MAILROOM_SCAN_DIR`, `MAILROOM_SERVER_DIR`, `MAILROOM_DRAFTS`), plus secrets.
- **Hosting.** There is no installer for this client yet; `deploy/windows` is UHY's.
- **Paths confirmed on site.** The firm shared its client-folder and tax-folder convention on 2 November. The other subfolders, the file names and the name of the Excel client list come from the demo built for it and still need checking against the real X: drive.

## The demo is separate

`seed/mailroom` and `demos/cwccpa` hold an anonymised demo ("XYZ CPA") for outside audiences, with fictional letters and clients. It is the mail room's default in development. It is not CWCCPA's configuration, and a production installation refuses to run on it.

## Tests

`tests/installation.test.ts` checks that the installation loads only the mail room, files under CWCCPA's layout, reads its own client list, and passes the production guard once the sender address is set.
