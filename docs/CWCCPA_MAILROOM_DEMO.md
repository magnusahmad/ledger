# CWCCPA mail room demo

How to run the inbound-mail demo for CWCCPA. Product decision: [DECISIONS.md](DECISIONS.md) #57. All letters, companies and people in the demo are fictional.

## Before the visit

1. `npm run mailroom:pack` builds `demos/cwccpa/letter-pack.pdf` (12 fictional letters, 17 pages, marked SPECIMEN) and the client index `seed/mailroom/cwccpa-demo-clients.csv`. Print the pack.
2. `npm run mailroom:reset` creates or empties the `clerk_cwc` database, loads the client index and makes a mock server under `storage/cwccpa/mailroom/` (`Scans`, `Server`, `Outlook drafts`). `Server` stands for their X: drive: `CWCHK Client Folder\<code>-<name>\<code>-Tax Folder` for each client, with fictional client codes.
3. `npm run mailroom:dev` starts the screen at http://localhost:3100/mailroom and the scan-folder worker.

The recorded model answers in `seed/mailroom/recordings/` make the pack run without the internet. A different scan (for example, the pack scanned on their copier) needs the live model (`or_api_key` in `.env`). Regenerate the recordings only after changing the pack, the prompts or the client index: `npm run mailroom:reset && npm run mailroom:record && npm run mailroom:reset`.

## The demo

1. Show `Server/CWCHK Client Folder` in Finder: their folder layout, untouched.
2. Feed the printed pack through their copier, scanning to a USB stick or to email, and save the PDF into `Scans`. If that fails, copy `demos/cwccpa/letter-pack.pdf` into `Scans`, or use "Add a scan by hand".
3. The batch appears within seconds as 12 letters. Approve a few. Show:
   - letter 3: two clients have similar names, so it asks;
   - letter 6: junk, filed with no email;
   - letter 11: the reference number wins over an old company name;
   - letter 12: not a client.
4. In Finder: the PDFs are in the client folders with the firm's names. Open a draft in `Outlook drafts`: it opens as an unsent email with the scan attached.
5. Undo one filing on the summary screen to show nothing is final.

## Not shown

Auto-filing, sending, and accuracy figures. Those come from the side-by-side weeks.

## The recorded walkthrough

`demos/cwccpa/mailroom-demo.mp4` (about 2 minutes) uses the same recorder as the Clerk demos: on-screen cursor, click ripples, keycaps for shortcuts, a highlight ring and captions placed clear of what matters. To re-record, with `npm run mailroom:dev` running:

```bash
npm run mailroom:reset && REC_BASE=http://localhost:3100 npx tsx scripts/record-demos/demo-mailroom.ts
```

`DRY=1` runs it fast without recording, to check the script still matches the screen.

## Live demo: one specimen letter, real inference

`demos/cwccpa/specimen-abc-ird-demand.pdf` is ABC Trading's IRD demand note on its own (2 pages, fictional). `npm run mailroom:live` runs the mail room with `MAILROOM_REPLAY=0`, so every scan is read by the live model through OpenRouter (`or_api_key` in `.env`, model `LLM_MODEL`); recordings are never used. Measured on 2 November: about 15 seconds from the file landing to the letter being ready (three model calls, 4 to 6 seconds each).

1. The night before: `npm ci`, `npm run mailroom:pack`, `npm run mailroom:reset`, then `npm run mailroom:live` and one full rehearsal. Reset again afterwards.
2. Arrange three windows: the browser at http://localhost:3100/mailroom, Finder at `storage/cwccpa/mailroom/Scans`, and Finder at `storage/cwccpa/mailroom/Server/CWCHK Client Folder/AL1203A1-ABC Trading Limited/AL1203A1-Tax Folder` (it holds only last year's letter).
3. Drag the specimen into `Scans` (or save their copier's scan of the printed specimen there). The scan appears in the browser, and about 15 seconds later shows "1 to check".
4. Open it and walk through: the client, matched on the IRD file number; HK$48,200 due 28 November with the 限 stamp; "Files to" the tax folder; "The email, and changes" with the Traditional Chinese draft.
5. Approve. The PDF appears in the tax folder window, and the draft appears in `storage/cwccpa/mailroom/Outlook drafts`. Outlook opens it as an unsent email with the scan attached.
6. Between runs: `npm run mailroom:reset` (the server can stay running).

No internet: stop the server and start `npm run mailroom:dev`. The specimen file (not a fresh copier scan) then runs from its recorded answers.

## Client list: read from the firm's own records

Nothing is migrated. The mail room keeps a read-only copy of the client list, refreshed from the sources in `seed/mailroom/client-sources.json` (`MAILROOM_CLIENT_SOURCES`), master first:

- `excel`: a workbook and sheet, with `columns` mapping our fields to the firm's headings;
- `access`: an `.mdb`/`.accdb` file and table, read from a copy of its bytes (the live database and its lock file are never opened);
- `csv`: an exported list;
- `folders`: the client folders on X:, with a pattern for `<code>-<name>` (a new folder adds the client before any list does).

The worker checks the sources every 30 seconds and applies them only when something changed. Clients are matched on the client code and updated in place, so letters in review stay linked. A client gone from every source is switched off, not deleted. Where sources disagree, the first source wins and the clash is listed at `/mailroom/clients` for the firm to fix in its own files. If a source can't be read, the last good list stays in use and Today says why. After each sync, letters waiting on "whose letter is this?" are matched again; letters staff have decided are left alone.

The demo's sources are the Excel list `Server/Admin/CWC client list.xlsx` (made by `npm run mailroom:pack`) and the folders under `Server/CWCHK Client Folder`. To show onboarding: create a folder such as `PH2001A1-Peak Harbour Investments Limited`; it appears on the clients page within about 30 seconds.

The Access reader is tested on rows, not on a real Access file. Before the trial, run it on an anonymised copy of the firm's database.

## Changing the model without a visit

`LLM_MODEL` is passed to OpenRouter as is, so it can name an OpenRouter preset (`@preset/cwccpa-mailroom`). Editing the preset's model in the OpenRouter dashboard then switches the installation on its next call. Use the preset only for the model and provider rules (our prompts stay in code), and switch only after the new model passes the mail room's test letters. The model that actually answered is logged on every call.
