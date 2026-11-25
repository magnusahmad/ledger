# UHY-ASK pilot: schedule dn-copy.ps1 on the pilot machine (run once, as administrator, and again
# whenever a workbook is renamed or moved, for example for a new year).
# Runs every day at 07:30 and 13:00, so Clerk reads what staff saved by the morning and by lunchtime.
param(
  [Parameter(Mandatory=$true)] [string] $RunAs,       # the account that can read the share
  [Parameter(Mandatory=$true)] [string] $DnSource,    # full path of the DN workbook on the share
  [string] $AgmSource = '',                           # full path of the AGM workbook on the share
  [string] $Script = 'C:\Clerk\app\clients\uhy\ops\dn-copy.ps1'
)
foreach ($p in $DnSource, $AgmSource) { if ($p -and -not (Test-Path -LiteralPath $p)) { throw "Not found: $p. Check the path, then run this again." } }
$cred = Get-Credential -UserName $RunAs -Message 'Password for the account that copies the workbooks'
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$Script`" -DnSource `"$DnSource`""
if ($AgmSource) { $arguments += " -AgmSource `"$AgmSource`"" }
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$triggers = @(
  New-ScheduledTaskTrigger -Daily -At 07:30
  New-ScheduledTaskTrigger -Daily -At 13:00
)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName 'Clerk workbook copy' -Action $action -Trigger $triggers -Settings $settings -User $cred.UserName -Password $cred.GetNetworkCredential().Password -RunLevel Highest -Force
"Registered. Run it now with: Start-ScheduledTask -TaskName 'Clerk workbook copy'"
"Then set CLIENT_LIST_FILE=C:\Clerk\sources\dn\dn.xlsx and AGM_TRACKER_FILE=C:\Clerk\sources\dn\agm.xlsx in C:\Clerk\app\.env.production and restart clerk-worker."
