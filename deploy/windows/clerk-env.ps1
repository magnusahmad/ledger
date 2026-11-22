# Clerk pilot: load the installation config and the protected secrets into THIS PowerShell window,
# for commands run by hand (creating the firm, adding users, reading the DN workbook or Access copy).
# Dot-source it in an administrator window, after install.ps1 has run:
#   . C:\Clerk\deploy\clerk-env.ps1
# Nothing is written anywhere. Closing the window forgets the values.
param([string] $AppDir = 'C:\Clerk\app')
. (Join-Path $PSScriptRoot 'secrets.ps1')
foreach ($line in Get-Content (Join-Path $AppDir '.env.production')) {
  if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process') }
}
foreach ($kv in (Get-ClerkSecrets).GetEnumerator()) { [Environment]::SetEnvironmentVariable($kv.Key, $kv.Value, 'Process') }
$env:NODE_ENV = 'production'
Set-Location $AppDir
"Clerk settings and secrets are loaded for this window only. You are in $AppDir."
