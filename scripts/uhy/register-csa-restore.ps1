# UHY-ASK pilot: schedule csa-restore.ps1 on the pilot machine (run once, as administrator).
# CSA writes its backups during the working day, so the copy is refreshed at 12:30 and 18:30 on weekdays.
param(
  [Parameter(Mandatory=$true)] [string] $RunAs,          # e.g. UHYASK\svc-clerk (needs read access to the backup share)
  [string] $ReaderAccount = $RunAs,
  [string] $Script = 'C:\Clerk\scripts\csa-restore.ps1'
)
$cred = Get-Credential -UserName $RunAs -Message 'Password for the account that runs the CSA restore'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Script`" -ReaderAccount `"$ReaderAccount`""
$triggers = @(
  New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At 12:30
  New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At 18:30
)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName 'Clerk CSA restore' -Action $action -Trigger $triggers -Settings $settings -User $cred.UserName -Password $cred.GetNetworkCredential().Password -RunLevel Highest -Force
"Registered. Run it now with: Start-ScheduledTask -TaskName 'Clerk CSA restore'"
