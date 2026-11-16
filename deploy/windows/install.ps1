# Clerk pilot: install or upgrade on the pilot machine (run as administrator, PowerShell 5.1+).
# Prerequisites installed by hand first (see README.md): Node.js 22 LTS, PostgreSQL 17, SQL Server 2022
# Express, WinSW and Caddy. This script never touches UHY's server, CSA's live database or F: contents.
param(
  [Parameter(Mandatory=$true)][string] $ServiceAccount,        # e.g. UHYASK\svc-clerk
  [string] $Root = 'C:\Clerk',
  [string] $Source = (Join-Path $PSScriptRoot '..\..'),        # the repository checkout copied to this machine
  [string] $OfficeSubnet = 'LocalSubnet'                        # or e.g. 192.168.1.0/24
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'secrets.ps1')
function Step($t) { Write-Host "`n== $t" -ForegroundColor Cyan }

Step 'Checking prerequisites'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node -or -not ((& node --version) -match '^v2[2-9]')) { throw 'Install Node.js 22 LTS first' }
foreach ($svc in 'postgresql*', 'MSSQL$SQLEXPRESS') { if (-not (Get-Service $svc -ErrorAction SilentlyContinue)) { throw "Service $svc not found; install it first (README.md)" } }
foreach ($f in "$Root\caddy\caddy.exe", "$PSScriptRoot\services\WinSW-x64.exe") { if (-not (Test-Path $f)) { throw "Missing $f (README.md)" } }
if (-not (Test-Path "$Root\certs\server.crt")) { throw "Copy server.crt and server.key from pilot-ca.sh to $Root\certs first" }

Step 'Copying the app'
foreach ($d in "$Root\app", "$Root\deploy", 'C:\ProgramData\Clerk\logs', 'C:\ProgramData\Clerk\csa') { if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d | Out-Null } }
robocopy $Source "$Root\app" /MIR /XD node_modules .next .next-* storage private crv-kb .git /XF .env .env.* /NFL /NDL /NJH /NJS | Out-Null
Copy-Item "$PSScriptRoot\*" "$Root\deploy" -Recurse -Force
if (-not (Test-Path "$Root\app\.env.production")) { Copy-Item "$PSScriptRoot\env.production.example" "$Root\app\.env.production"; Write-Warning "Edit $Root\app\.env.production, then run this script again."; return }

Step 'Installing packages and building (needs outbound HTTPS)'
Push-Location "$Root\app"
try {
  npm ci --no-audit --no-fund; if ($LASTEXITCODE) { throw 'npm ci failed' }
  foreach ($line in Get-Content .env.production) { if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)$') { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process') } }
  foreach ($kv in (Get-ClerkSecrets).GetEnumerator()) { [Environment]::SetEnvironmentVariable($kv.Key, $kv.Value, 'Process') }
  $env:NODE_ENV = 'production'
  npm run build; if ($LASTEXITCODE) { throw 'build failed' }
  node node_modules\tsx\dist\cli.mjs scripts\migrate.ts; if ($LASTEXITCODE) { throw 'migration failed' }
} finally { Pop-Location }

Step 'Locking down folders'
icacls "$Root\app" /grant "${ServiceAccount}:(OI)(CI)M" | Out-Null
icacls 'C:\ProgramData\Clerk' /grant "${ServiceAccount}:(OI)(CI)M" | Out-Null
icacls "$Root\certs" /inheritance:r /grant:r 'SYSTEM:(OI)(CI)F' 'Administrators:(OI)(CI)F' "${ServiceAccount}:(OI)(CI)R" | Out-Null
Protect-ClerkSecretsFile -ServiceAccount $ServiceAccount

Step 'Installing services'
$cred = Get-Credential -UserName $ServiceAccount -Message 'Password for the Clerk service account'
foreach ($n in 'clerk-web', 'clerk-worker', 'clerk-caddy') {
  $exe = "$Root\deploy\services\$n.exe"
  Copy-Item "$Root\deploy\services\WinSW-x64.exe" $exe -Force
  if (Get-Service $n -ErrorAction SilentlyContinue) { & $exe stop | Out-Null; & $exe uninstall | Out-Null }
  if ($n -eq 'clerk-caddy') { & $exe install } else { & $exe install --username $cred.UserName --password $cred.GetNetworkCredential().Password }
  & $exe start
}

Step 'Firewall: HTTPS from the office network only'
Get-NetFirewallRule -DisplayName 'Clerk HTTPS' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName 'Clerk HTTPS' -Direction Inbound -Protocol TCP -LocalPort 443 -RemoteAddress $OfficeSubnet -Action Allow -Profile Domain,Private | Out-Null

Step 'Health'
Start-Sleep -Seconds 20
try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/api/health).Content } catch { Write-Warning "Health check not ready yet: $($_.Exception.Message). Logs: C:\ProgramData\Clerk\logs" }
"Installed. Next: npm run firm:init and npm run user:add (README.md)."
