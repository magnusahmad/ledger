# Clerk pilot: secrets protected with Windows DPAPI (machine scope) in a file readable only by
# SYSTEM, Administrators and the service account. Never in the config file, logs or the repo.
#   . .\secrets.ps1; Set-ClerkSecret -Name OR_API_KEY            (prompts, nothing echoed)
#   . .\secrets.ps1; Set-ClerkSecret -Name GRAPH_PRIVATE_KEY_PEM -FromFile C:\path\graph-key.pem
Add-Type -AssemblyName System.Security
$script:SecretsFile = 'C:\ProgramData\Clerk\secrets\secrets.json'

function Get-ClerkSecrets {
  if (-not (Test-Path $script:SecretsFile)) { return @{} }
  $raw = Get-Content $script:SecretsFile -Raw | ConvertFrom-Json
  $out = @{}
  foreach ($p in $raw.PSObject.Properties) {
    $bytes = [Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($p.Value), $null, 'LocalMachine')
    $out[$p.Name] = [Text.Encoding]::UTF8.GetString($bytes)
  }
  return $out
}

function Set-ClerkSecret {
  param([Parameter(Mandatory=$true)][string] $Name, [string] $FromFile, [string] $ServiceAccount)
  $dir = Split-Path $script:SecretsFile
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $value = if ($FromFile) { Get-Content $FromFile -Raw } else {
    $s = Read-Host -AsSecureString "Value for $Name"
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
  }
  $all = @{}
  if (Test-Path $script:SecretsFile) { (Get-Content $script:SecretsFile -Raw | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $all[$_.Name] = $_.Value } }
  $all[$Name] = [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($value), $null, 'LocalMachine'))
  ($all | ConvertTo-Json) | Set-Content $script:SecretsFile -Encoding UTF8
  if ($ServiceAccount) { Protect-ClerkSecretsFile -ServiceAccount $ServiceAccount }
  "Saved $Name."
}

function Protect-ClerkSecretsFile {
  param([Parameter(Mandatory=$true)][string] $ServiceAccount)
  $dir = Split-Path $script:SecretsFile
  icacls $dir /inheritance:r /grant:r 'SYSTEM:(OI)(CI)F' 'Administrators:(OI)(CI)F' "${ServiceAccount}:(OI)(CI)R" | Out-Null
}
