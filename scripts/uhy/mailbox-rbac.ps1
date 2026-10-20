# UHY-ASK pilot, Stage 2: limit the pilot app to the three team mailboxes.
# CHANGES EXCHANGE ONLINE. Run with an account holding the Exchange Administrator role.
# Uses RBAC for Applications: https://learn.microsoft.com/graph/auth-limit-mailbox-access
# Prerequisites: app registered in Entra with NO Microsoft Graph mail permissions granted;
# IDs taken from Entra > Enterprise applications (not App registrations).
param(
  [Parameter(Mandatory)] [string] $AdminUpn,
  [Parameter(Mandatory)] [string] $AppId,            # Enterprise applications > Application ID
  [Parameter(Mandatory)] [string] $ObjectId,         # Enterprise applications > Object ID
  [Parameter(Mandatory)] [string[]] $TeamMailboxes,  # the three personal mailboxes
  [Parameter(Mandatory)] [string] $OutOfScopeMailbox,# any other mailbox, to prove the limit
  [string] $GroupName = 'UHY pilot team mailboxes',
  [string] $ScopeName = 'UHY pilot team mailboxes'
)
$ErrorActionPreference = 'Stop'
if (-not (Get-Module -ListAvailable ExchangeOnlineManagement)) {
  Install-Module ExchangeOnlineManagement -Scope CurrentUser -Force
}
Connect-ExchangeOnline -UserPrincipalName $AdminUpn -ShowBanner:$false

# 1. Mail-enabled security group holding exactly the team mailboxes (direct members only).
$group = Get-DistributionGroup -Identity $GroupName -ErrorAction SilentlyContinue
if (-not $group) {
  $group = New-DistributionGroup -Name $GroupName -Type Security -Members $TeamMailboxes
  Set-DistributionGroup -Identity $GroupName -HiddenFromAddressListsEnabled $true -RequireSenderAuthenticationEnabled $true
}
$members = (Get-DistributionGroupMember -Identity $GroupName).PrimarySmtpAddress
"Group members: $($members -join ', ')"

# 2. Exchange pointer to the Entra service principal.
if (-not (Get-ServicePrincipal -Identity $ObjectId -ErrorAction SilentlyContinue)) {
  New-ServicePrincipal -AppId $AppId -ObjectId $ObjectId -DisplayName 'UHY Harbourline pilot' | Out-Null
}

# 3. Management scope: only mailboxes that are direct members of the group.
$dn = (Get-Group -Identity $GroupName).DistinguishedName
if (-not (Get-ManagementScope -Identity $ScopeName -ErrorAction SilentlyContinue)) {
  New-ManagementScope -Name $ScopeName -RecipientRestrictionFilter "MemberOfGroup -eq '$dn'" | Out-Null
}

# 4. Read and draft, never send: Application Mail.ReadWrite within the scope.
$assignment = 'UHY pilot Mail.ReadWrite'
if (-not (Get-ManagementRoleAssignment -Identity $assignment -ErrorAction SilentlyContinue)) {
  New-ManagementRoleAssignment -Name $assignment -App $ObjectId -Role 'Application Mail.ReadWrite' -CustomResourceScope $ScopeName | Out-Null
}

# 5. Prove the limit (bypasses Microsoft's permission cache).
"`nIn scope (expect InScope = True):"
foreach ($m in $TeamMailboxes) {
  Test-ServicePrincipalAuthorization -Identity $ObjectId -Resource $m | Select-Object RoleName, InScope | Format-Table -AutoSize
}
"Out of scope (expect InScope = False):"
Test-ServicePrincipalAuthorization -Identity $ObjectId -Resource $OutOfScopeMailbox | Select-Object RoleName, InScope | Format-Table -AutoSize

"`nAlso confirm in Entra > Enterprise applications > UHY Harbourline pilot > Permissions that NO Microsoft Graph Mail permission is granted; a tenant-wide grant would override this scope."
Disconnect-ExchangeOnline -Confirm:$false
