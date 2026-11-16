# Clerk pilot: started by the Windows services (WinSW). Loads the installation config and the
# DPAPI-protected secrets into this process only, then runs the web app or the background worker.
param([Parameter(Mandatory=$true)][ValidateSet('web','worker')] [string] $Role, [string] $AppDir = 'C:\Clerk\app')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'secrets.ps1')
Set-Location $AppDir
foreach ($line in Get-Content (Join-Path $AppDir '.env.production')) {
  if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') { [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process') }
}
foreach ($kv in (Get-ClerkSecrets).GetEnumerator()) { [Environment]::SetEnvironmentVariable($kv.Key, $kv.Value, 'Process') }
$env:NODE_ENV = 'production'
$node = (Get-Command node).Source
if ($Role -eq 'web') { & $node 'node_modules\next\dist\bin\next' start -H 127.0.0.1 -p 3000 }
else { & $node 'node_modules\tsx\dist\cli.mjs' 'src\worker\annual.ts' }
exit $LASTEXITCODE
