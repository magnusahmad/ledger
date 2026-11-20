# UHY-ASK pilot, Stage 2: smoke test of mailbox access from the server. Read-only.
# Prints folder names and item counts only, never message content.
# Allow up to two hours after mailbox-rbac.ps1 for Microsoft's permission cache.
param(
  [Parameter(Mandatory)] [string] $TenantId,
  [Parameter(Mandatory)] [string] $AppId,
  [Parameter(Mandatory)] [string] $Thumbprint,      # from new-app-cert.ps1
  [Parameter(Mandatory)] [string[]] $TeamMailboxes,
  [Parameter(Mandatory)] [string] $OutOfScopeMailbox
)
$ErrorActionPreference = 'Stop'
foreach ($m in 'Microsoft.Graph.Authentication','Microsoft.Graph.Mail') {
  if (-not (Get-Module -ListAvailable $m)) { Install-Module $m -Scope CurrentUser -Force }
}
$cert = Get-Item "Cert:\LocalMachine\My\$Thumbprint"
Connect-MgGraph -TenantId $TenantId -ClientId $AppId -Certificate $cert -NoWelcome

foreach ($mb in $TeamMailboxes) {
  "`n$mb"
  Get-MgUserMailFolder -UserId $mb -All | Select-Object DisplayName, TotalItemCount | Format-Table -AutoSize
}
"`n$OutOfScopeMailbox (expect access denied):"
try {
  Get-MgUserMailFolder -UserId $OutOfScopeMailbox -Top 1 | Out-Null
  'UNEXPECTED: out-of-scope mailbox was readable. Stop and check Entra for a tenant-wide Mail grant.'
} catch { "Refused as expected: $($_.Exception.Message.Split([Environment]::NewLine)[0])" }
Disconnect-MgGraph | Out-Null
