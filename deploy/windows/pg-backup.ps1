# Clerk pilot: daily backup of the pilot's own PostgreSQL database to the firm's share.
# UHY's existing backups (run by Topone) then cover the share. Keeps the newest 14 dumps.
param([Parameter(Mandatory=$true)][string] $Target, [string] $Database = 'clerk_uhy', [string] $PgBin = 'C:\Program Files\PostgreSQL\17\bin')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'secrets.ps1')
$url = (Get-ClerkSecrets)['DATABASE_URL']
if (-not (Test-Path $Target)) { New-Item -ItemType Directory -Path $Target | Out-Null }
$file = Join-Path $Target ("clerk-{0:yyyyMMdd-HHmm}.dump" -f (Get-Date))
& (Join-Path $PgBin 'pg_dump.exe') --format=custom --file=$file $url
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed ($LASTEXITCODE)" }
Get-ChildItem $Target -Filter 'clerk-*.dump' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 14 | Remove-Item -Force
"Backed up to $file"
