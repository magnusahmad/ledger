# CWCCPA mail room demo

How to run the inbound-mail demo for CWCCPA. Product decision: [DECISIONS.md](DECISIONS.md) #57. All letters, companies and people in the demo are fictional.

## Before the visit

1. `npm run mailroom:pack` builds `demos/cwccpa/letter-pack.pdf` (12 fictional letters, 17 pages, marked SPECIMEN) and the client index `seed/mailroom/cwccpa-demo-clients.csv`. Print the pack.
2. `npm run mailroom:reset` creates or empties the `harbourline_cwc` database, loads the client index and makes a mock server under `storage/cwccpa/mailroom/` (`Scans`, `Server`, `Outlook drafts`). `Server` stands for their X: drive: `CWCHK Client Folder\<code>-<name>\<code>-Tax Folder` for each client, with fictional client codes.
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

`demos/cwccpa/mailroom-demo.mp4` (about 2 minutes) uses the same recorder as the Harbourline demos: on-screen cursor, click ripples, keycaps for shortcuts, a highlight ring and captions placed clear of what matters. To re-record, with `npm run mailroom:dev` running:

```bash
npm run mailroom:reset && REC_BASE=http://localhost:3100 npx tsx scripts/record-demos/demo-mailroom.ts
```

`DRY=1` runs it fast without recording, to check the script still matches the screen.
