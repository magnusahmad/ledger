# Installing the Harbourline pilot on the pilot machine

The pilot runs on UHY's spare ASUS ExpertCenter D7 (Windows 11 Pro), never on UHY's 2008 R2 server. Everything here is **untested on Windows until the first install**; check each step's result before moving on. Nothing here changes UHY's server, CSA's live database or the contents of F:.

## What runs

- **PostgreSQL 17**: the pilot's own database, listening on localhost only.
- **SQL Server 2022 Express**: holds `CSA_Copy`, restored from CSA's own backup by `scripts/uhy/csa-restore.ps1`.
- **harbourline-web** and **harbourline-worker** (Windows services via WinSW), running as the domain service account.
- **harbourline-caddy**: HTTPS on port 443 for the office network, using the pilot certificate.

## 1. Before the visit (on your Mac)

1. Run `deploy/windows/pilot-ca.sh harbourline harbourline.uhyask.local <fixed IP>`. Keep `ca.key` offline. Take `ca.crt`, `server.crt` and `server.key`.
2. Ask Topone for: the D7's fixed IP and a DNS name `harbourline.uhyask.local` pointing to it; the service account; the UNC path of the F: share.

## 2. Prerequisites on the D7 (as administrator)

1. **Node.js 22 LTS** (Windows installer from nodejs.org).
2. **PostgreSQL 17** (EDB installer). Note the `postgres` password. Create the database:
   `psql -U postgres -c "CREATE ROLE harbourline LOGIN PASSWORD '<new password>'" -c "CREATE DATABASE harbourline_uhy OWNER harbourline"`.
3. **SQL Server 2022 Express**, instance `SQLEXPRESS`, **mixed-mode authentication** on. In SQL Server Configuration Manager enable **TCP/IP** and start **SQL Server Browser**.
4. **PowerShell 7** (for the mail certificate), **WinSW** (`WinSW-x64.exe` into `deploy\windows\services\`) and **Caddy** (`caddy.exe` into `C:\Harbourline\caddy\`).
5. Copy `server.crt` and `server.key` into `C:\Harbourline\certs\`.

## 3. Secrets (never in files or chat)

In PowerShell as administrator, from `deploy\windows`:
```
. .\secrets.ps1
Set-HarbourlineSecret -Name DATABASE_URL          # postgres://harbourline:<password>@localhost/harbourline_uhy
Set-HarbourlineSecret -Name APP_SECRET            # 48+ random characters
Set-HarbourlineSecret -Name or_api_key            # the UHY OpenRouter key with a spend limit
Set-HarbourlineSecret -Name CSA_READER_PASSWORD   # a new strong password for the read-only SQL login
Set-HarbourlineSecret -Name CSA_SQL_CONNECTION    # Server=localhost\SQLEXPRESS;Database=CSA_Copy;User Id=harbourline_reader;Password=<same>;Encrypt=true;TrustServerCertificate=true
```
For mail: run `scripts\uhy\new-app-cert.ps1` in PowerShell 7 (stores `GRAPH_PRIVATE_KEY_PEM`), or store a client secret as `GRAPH_CLIENT_SECRET`.

## 4. Install

```
.\install.ps1 -ServiceAccount UHYASK\svc-harbourline -OfficeSubnet 192.168.1.0/24
```
The first run copies `env.production.example` to `C:\Harbourline\app\.env.production` and stops; fill it in (mailboxes, Graph IDs, F: path, status folder), then run it again. It builds the app, runs migrations, installs the three services and the firewall rule, and checks `/api/health`.

Then, from `C:\Harbourline\app` with the same environment loaded:
```
npm run firm:init -- --name "<UHY's secretarial company>" --address "<office address>" --email <cosec email> --phone "<phone>"
npm run user:add -- --email <ruby's address> --name Ruby --initials RL --role staff
```
(repeat `user:add` for Coe and Allan; Allan as `approver`).

## 5. CSA copy

1. Copy `scripts\uhy\csa-mapping.example.json` to `C:\Harbourline\config\csa-mapping.json` and rewrite its queries against the restored copy's real tables (first restore: run `scripts\uhy\csa-restore.ps1` by hand, then `csa-schema.sql` on `CSA_Copy`).
2. `scripts\uhy\register-csa-restore.ps1 -RunAs UHYASK\svc-harbourline` schedules the restore at 12:30 and 18:30 on weekdays.

## 6. Backups

Schedule `pg-backup.ps1 -Target \\<server>\<share>\Harbourline\backups` daily under the service account. Restore with `pg_restore --clean -d harbourline_uhy <file>`.

## 7. Staff PCs

Install `ca.crt` into **Trusted Root Certification Authorities (Local Computer)** on each PC (Topone's instruction: over TeamViewer with `uhyask\uhyadmin`), then open `https://harbourline.uhyask.local`. No certificate warning should appear.

## Rollback

Stop and uninstall the three services (`<service>.exe stop`, `<service>.exe uninstall` in `C:\Harbourline\deploy\services`), remove the firewall rule `Harbourline HTTPS` and the scheduled tasks. UHY's systems are unchanged by design; files Harbourline saved to F: stay where staff can see them.
