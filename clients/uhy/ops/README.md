# UHY-ASK pilot: setup scripts

Assessment scripts run on UHY's Windows Server over AnyDesk; setup scripts run on the pilot machine, as described in `clients/uhy/docs/UHY_PILOT_PLAN.md`. Server scripts run on PowerShell 2.0 (Windows Server 2008 R2); extract the zip first, then double-click the `.cmd` launcher. Every script here is read-only against UHY's data unless its header says otherwise. Outputs go to `C:\uhy-pilot\out\`; copy off the server only the files each step names (schema and server facts, never client values).

| Script | Stage | Changes anything? |
|---|---|---|
| `1-assess-server.cmd` | 1 | No. Double-click launcher for `assess-server.ps1` (no typing or pasting needed). |
| `2-list-databases.cmd` | 1 | No. Launcher for `list-databases.ps1`: SQL version, databases, last backups and how clients connect (counts only). Defaults to localhost\CSAEXPERT. |
| `3-csa-schema.cmd` | 1 | No. Runs `csa-schema.sql` against `CSA_Expert_1` on `localhost\CSAEXPERT`. |
| `4-list-csa-backups.cmd` | 1 | No. Lists CSA backup files and any backup schedules (names, sizes, dates). |
| `5-check-backup-format.cmd` | 1 | No. Reads the first 64 bytes of the newest CSA backup to identify its format. |
| `6-find-source-files.cmd` | 1 | No. Launcher for `find-source-files.ps1`: lists Access databases (`.accdb`, `.mdb`), Access lock files and DN workbooks (names containing Debit or DN) on the server's disk shares, with sizes and dates; never opens them. Output stays on the server, as paths can include client names: copy off only the DN and Access lines. |
| `assess-server.ps1` | 1 | No. Writes a facts file. |
| `run-sql.ps1` | 1, 4 | Runs any `.sql` file here with Windows authentication when `sqlcmd` isn't installed; writes results to CSV. |
| `csa-schema.sql` | 1 | No. Exports table and column names, types and row counts. |
| `csa-find-value.sql` | 1 | No. Reports which table and column hold a value you type from the CSA screen; prints names and counts, never values. |
| `csa-readonly-login.sql` | 1 or 4 | Yes: creates a read-only (`db_datareader`) user for one Windows account on the CSA database only. |
| `new-app-cert.ps1` | 2 | Yes, on the pilot machine: creates the Entra app certificate, writes the public `.cer`, and stores the private key only as a DPAPI-protected secret. Needs PowerShell 7. |
| `mailbox-rbac.ps1` | 2 | Yes: Exchange Online service principal, management scope and role assignment limited to the team-mailbox group. |
| `mailbox-smoke.ps1` | 2 | No. Lists folder names and counts only, and checks that an out-of-scope mailbox is refused. |

## On the pilot machine (not UHY's server)

| Script | Changes anything? |
|---|---|
| `csa-restore.ps1` | Yes, on the pilot machine only: copies the newest `.csa` backup from the share and restores it as the read-only `CSA_Copy`; swaps only after a successful restore; writes `restore-status.json` with the backup's own finish time (`RESTORE HEADERONLY`), which the app shows as the CSA copy's age. Never touches the live CSA database. |
| `register-csa-restore.ps1` | Yes: schedules the restore at 12:30 and 18:30 on weekdays under the service account. |
| `csa-mapping.example.json` | Template for the installation's CSA mapping, filled in on site from the restored copy. |
| `sources.ts` | No. Reads the DN workbook and Access database over the share. `discover-dn <xlsx>` and `discover-access <folder, accdb or xlsx export>` write headers, column names, types, counts and value shapes (never values) to `private/uhy/discovery/`; `check-dn <xlsx> [--sheet name]` reports missing and unknown columns and unparseable cells by row. Given a folder, `discover-access` uses the newest `.accdb`/`.mdb` there and warns when it is more than 10 days old (`--max-age-days n`). Run from `C:\Clerk\app` with `node node_modules\tsx\dist\cli.mjs clients\uhy\ops\sources.ts ...` (avoids the `npx.ps1` execution-policy block). |

Confirmed locations (Coe, 18 November): the DN workbook is `2025 COSEC DN NEW` in `D:\Public\Cosec\Debit Notes`, and the Access database is on UHY's QNAP storage behind a SmartShare link (Coe, 19 November, correcting F:): download it once a week, unopened, into `C:\Clerk\sources\access\` on the pilot machine. Never store the SmartShare password on the pilot machine. Done, Sent, Received, Scan and File all track the AGM (Coe, 19 November). The DN column mapping is `clients/uhy/data/dn-columns.json`; the full table and how ticks and dates are read are in `clients/uhy/docs/UHY_AR_AGM_PILOT.md` ("Source data").

**Not verified on UHY's systems:** `find-source-files.ps1` and the `csa-restore.ps1` changes have not run anywhere (no PowerShell here); the Access reader's mdb-reader adapter has not opened a real `.accdb` (no fixture can be written on macOS); the DN reader has run only on fictional workbooks.
