# UHY-ASK pilot: setup scripts

Run on UHY's Windows Server over AnyDesk, as described in `docs/UHY_PILOT_PLAN.md`. Every script here is read-only against UHY's data unless its header says otherwise. Outputs go to `C:\uhy-pilot\out\`; copy off the server only the files each step names (schema and server facts, never client values).

| Script | Stage | Changes anything? |
|---|---|---|
| `1-assess-server.cmd` | 1 | No. Double-click launcher for `assess-server.ps1` (no typing or pasting needed). |
| `2-list-databases.cmd` | 1 | No. Launcher for `list-databases.ps1`: SQL version, databases, last backups and how clients connect (counts only). Defaults to localhost\CSAEXPERT. |
| `3-csa-schema.cmd` | 1 | No. Runs `csa-schema.sql` against `CSA_Expert_1` on `localhost\CSAEXPERT`. |
| `4-list-csa-backups.cmd` | 1 | No. Lists CSA backup files and any backup schedules (names, sizes, dates). |
| `5-check-backup-format.cmd` | 1 | No. Reads the first 64 bytes of the newest CSA backup to identify its format. |
| `assess-server.ps1` | 1 | No. Writes a facts file. |
| `run-sql.ps1` | 1, 4 | Runs any `.sql` file here with Windows authentication when `sqlcmd` isn't installed; writes results to CSV. |
| `csa-schema.sql` | 1 | No. Exports table and column names, types and row counts. |
| `csa-find-value.sql` | 1 | No. Reports which table and column hold a value you type from the CSA screen; prints names and counts, never values. |
| `csa-readonly-login.sql` | 1 or 4 | Yes: creates a read-only (`db_datareader`) user for one Windows account on the CSA database only. |
| `new-app-cert.ps1` | 2 | Yes: creates a non-exportable certificate in the server's machine store for the Entra app. |
| `mailbox-rbac.ps1` | 2 | Yes: Exchange Online service principal, management scope and role assignment limited to the team-mailbox group. |
| `mailbox-smoke.ps1` | 2 | No. Lists folder names and counts only, and checks that an out-of-scope mailbox is refused. |
