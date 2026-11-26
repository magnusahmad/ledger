# Installing the Clerk pilot on the pilot machine

The pilot runs on UHY's spare ASUS ExpertCenter D7 (Windows 11 Pro), never on UHY's 2008 R2 server. Everything here is **untested on Windows until the first install**; check each step's result before moving on. Nothing here changes UHY's server, CSA's live database or the contents of F:.

## What runs

- **PostgreSQL 17**: the pilot's own database, listening on localhost only.
- **SQL Server 2022 Express**: holds `CSA_Copy`, restored from CSA's own backup by `clients/uhy/ops/csa-restore.ps1`.
- **clerk-web** and **clerk-worker** (Windows services via WinSW), running as the domain service account.
- **clerk-caddy**: HTTPS on port 443 for the office network, using the pilot certificate.

## 1. Before the session (on your Mac)

1. Cut the bundle for this client from a committed `main`: `npm run release -- uhy --zip`. It writes `dist/clerk-uhy-<commit>.zip`. Send only that file to the D7. Never copy the working folder: it holds other clients' material and CRV's own documents. The bundle carries `build.json`, which is how the installation later says which build it is.
2. Run `deploy/windows/pilot-ca.sh clerk clerk.uhyask.local <fixed IP>`. Keep `ca.key` offline. Take `ca.crt`, `server.crt` and `server.key`.
3. Ask Topone for: the D7's fixed IP and a DNS name `clerk.uhyask.local` pointing to it; the service account; the UNC path of the F: share.

## 2. Prerequisites on the D7 (as administrator)

**Every PowerShell window used below:** open it as administrator and run this first. The D7 blocks scripts by default (seen on 19 November with `npx.ps1`); this allows them for that window only and changes no machine setting.
```
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
```

1. **Node.js 22 LTS** (Windows installer from nodejs.org).
2. **PostgreSQL 17** (EDB installer). Note the `postgres` password. Create the database:
   `psql -U postgres -c "CREATE ROLE clerk LOGIN PASSWORD '<new password>'" -c "CREATE DATABASE clerk_uhy OWNER clerk"`.
3. **SQL Server 2022 Express**, instance `SQLEXPRESS`, **mixed-mode authentication** on. In SQL Server Configuration Manager enable **TCP/IP** and start **SQL Server Browser**.
4. **PowerShell 7** (for the mail certificate), **WinSW** (`WinSW-x64.exe` into `deploy\windows\services\`) and **Caddy** (`caddy.exe` into `C:\Clerk\caddy\`).
5. Copy `server.crt` and `server.key` into `C:\Clerk\certs\`.
6. Extract the bundle zip, for example to `C:\Clerk\bundle\clerk-uhy-<commit>`. The commands below are run from its `deploy\windows` folder.
7. Give the service account the **Log on as a service** right: `secpol.msc`, Local Policies, User Rights Assignment. Without it the two services fail to start with error 1069. If a domain policy sets this right, ask Topone to add the account there.
8. Give the service account rights on the local SQL Server instance, which holds only the CSA copy: it restores the copy and creates the read-only login. In SQL Server Management Studio or with `clients\uhy\ops\run-sql.ps1`: `CREATE LOGIN [UHYASK\svc-clerk] FROM WINDOWS; ALTER SERVER ROLE sysadmin ADD MEMBER [UHYASK\svc-clerk];`
9. If Node.js was installed since the machine last restarted, restart it once. Windows services only see a changed PATH after a restart.

## 3. Secrets (never in files or chat)

In PowerShell as administrator, from `deploy\windows`:
```
. .\secrets.ps1
Set-ClerkSecret -Name DATABASE_URL          # postgres://clerk:<password>@localhost/clerk_uhy
Set-ClerkSecret -Name APP_SECRET            # 48+ random characters
Set-ClerkSecret -Name or_api_key            # the UHY OpenRouter key with a spend limit (only when AR_REPLY_READER=1)
Set-ClerkSecret -Name CSA_READER_PASSWORD   # a new strong password for the read-only SQL login
Set-ClerkSecret -Name CSA_SQL_CONNECTION    # Server=localhost\SQLEXPRESS;Database=CSA_Copy;User Id=clerk_reader;Password=<same>;Encrypt=true;TrustServerCertificate=true
```
For mail, after the first run of `install.ps1` below (the script loads `C:\Clerk\deploy\secrets.ps1`, which that run puts in place): run `clients\uhy\ops\new-app-cert.ps1` in PowerShell 7 (stores `GRAPH_PRIVATE_KEY_PEM`), or store a client secret as `GRAPH_CLIENT_SECRET`.

If the database password contains characters such as `@`, `:`, `/` or `#`, write them percent-encoded in `DATABASE_URL`, or choose a password of letters and digits.

## 4. Install

```
.\install.ps1 -ServiceAccount UHYASK\svc-clerk -OfficeSubnet 192.168.1.0/24
```
The first run copies `env.production.example` to `C:\Clerk\app\.env.production` and stops; fill it in (mailboxes, Graph IDs, F: path, status folder), then run it again. The file names the client profile (`INSTALLATION_PROFILE=uhy`), which sets the modules, firm id and UHY's own filing rules and email template from `clients/uhy/`; the installation refuses to start without it. The script also stamps the build: `https://<host>/api/health` then reports the commit, client profile, modules and model under `build`. A bundle made with `npm run release` already carries its stamp. It builds the app, runs migrations, installs the three services and the firewall rule, and checks `/api/health`.

Then load the settings and secrets into the window and run the two setup commands through node. Do not use `npm run` here: in PowerShell it loses the arguments after `--`, and it would not have the secrets.
```
. C:\Clerk\deploy\clerk-env.ps1
node node_modules\tsx\dist\cli.mjs scripts\firm-init.ts --name "<UHY's secretarial company>" --address "<office address>" --email <cosec email> --phone "<phone>"
node node_modules\tsx\dist\cli.mjs scripts\user-add.ts --email <ruby's address> --name Ruby --initials RL --role staff
```
(repeat `user:add` for Coe and Allan; Allan as `approver`).

**Microsoft 365 sign-in.** With `SSO=microsoft` in the settings file, staff sign in with their Microsoft account and need no Clerk password. In the app registration (the same one the mailboxes use) add `https://<this machine's name>/api/auth/microsoft/callback` under Authentication as a Web redirect address; no extra permission is needed beyond sign-in. `APP_URL` must be the https address staff use. Add each person with `user-add.ts` as above; no password is asked for. Keep one account with a password as a fallback, made with `--password`, and reset it if forgotten with:

```
node node_modules\tsx\dist\cli.mjs scripts\user-password.ts --email <the fallback account's address>
```

## 5. CSA copy

1. Copy `clients\uhy\ops\csa-mapping.example.json` to `C:\Clerk\config\csa-mapping.json` and rewrite its queries against the restored copy's real tables (first restore: run `clients\uhy\ops\csa-restore.ps1` by hand, then `csa-schema.sql` on `CSA_Copy`).
2. From `C:\Clerk\app`: `clients\uhy\ops\register-csa-restore.ps1 -RunAs UHYASK\svc-clerk` schedules the restore at 12:30 and 18:30 on weekdays. It runs the copy of `csa-restore.ps1` in `C:\Clerk\app\clients\uhy\ops`.

## 6. Backups

Schedule `powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Clerk\deploy\pg-backup.ps1 -Target \\<server>\<share>\Clerk\backups` daily under the service account. Restore with `pg_restore --clean -d clerk_uhy <file>`.

## 7. Staff PCs

Install `ca.crt` into **Trusted Root Certification Authorities (Local Computer)** on each PC (Topone's instruction: over TeamViewer with `uhyask\uhyadmin`), then open `https://clerk.uhyask.local`. No certificate warning should appear.

## Rollback

Stop and uninstall the three services (`<service>.exe stop`, `<service>.exe uninstall` in `C:\Clerk\deploy\services`), remove the firewall rule `Clerk HTTPS` and the scheduled tasks. UHY's systems are unchanged by design; files Clerk saved to F: stay where staff can see them.

## Checked for Windows on 22 November, still unproven

Reviewed on a Mac, not run on Windows. Fixed in that review: the installer now calls `npm.cmd`, installs the development packages the worker needs, stops the services before replacing files, sets the service account through Windows (no dependence on the WinSW version), and the proxy config uses forward slashes. The status workbook now reports plainly when it is open in Excel and cannot be replaced.

Watch for these on the first run:

- **WinSW version.** Any current `WinSW-x64.exe` should do, since only `install`, `start`, `stop` and `uninstall` are used.
- **A status workbook left open.** The annual page will say the file is open on someone's computer until it is closed. That is expected.
- **Model calls from Hong Kong.** If `AR_REPLY_READER=1` and readings fail with a 403 naming an unsupported region, set it to `0` and tell CRV: the provider may be refusing Hong Kong addresses.
- **File names.** Client codes and names go into folder and file names on F:. Characters Windows forbids are replaced with spaces. A name longer than about 200 characters could exceed the path limit on older tools.
