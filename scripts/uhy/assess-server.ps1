# UHY-ASK pilot, Stage 1: server facts. Read-only.
# Run in PowerShell on the UHY server. Output: C:\uhy-pilot\out\server-facts.txt
$ErrorActionPreference = 'Continue'
$out = 'C:\uhy-pilot\out'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$f = Join-Path $out 'server-facts.txt'

function Section($t) { "`n=== $t ===" | Tee-Object -FilePath $f -Append }

"UHY pilot server assessment $(Get-Date -Format s)" | Set-Content $f

Section 'Operating system'
Get-CimInstance Win32_OperatingSystem |
  Select-Object Caption, Version, BuildNumber, OSArchitecture, LastBootUpTime,
    @{n='TotalMemoryGB';e={[math]::Round($_.TotalVisibleMemorySize/1MB,1)}},
    @{n='FreeMemoryGB';e={[math]::Round($_.FreePhysicalMemory/1MB,1)}} |
  Format-List | Out-String | Tee-Object -FilePath $f -Append

Section 'CPU'
Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, LoadPercentage |
  Format-Table -AutoSize | Out-String | Tee-Object -FilePath $f -Append

Section 'Disks'
Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' |
  Select-Object DeviceID, VolumeName,
    @{n='SizeGB';e={[math]::Round($_.Size/1GB,1)}},
    @{n='FreeGB';e={[math]::Round($_.FreeSpace/1GB,1)}} |
  Format-Table -AutoSize | Out-String | Tee-Object -FilePath $f -Append

Section 'Shares on this server'
Get-SmbShare | Where-Object { $_.Name -notmatch '\$$' } | Select-Object Name, Path |
  Format-Table -AutoSize | Out-String | Tee-Object -FilePath $f -Append

Section 'Domain'
Get-CimInstance Win32_ComputerSystem | Select-Object Name, Domain, PartOfDomain |
  Format-List | Out-String | Tee-Object -FilePath $f -Append

Section 'SQL Server instances'
$inst = 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL'
if (Test-Path $inst) {
  $names = Get-ItemProperty $inst
  $names.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object {
    $id = $_.Value
    $setup = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$id\Setup"
    $s = Get-ItemProperty $setup -ErrorAction SilentlyContinue
    "Instance: $($_.Name)  Id: $id  Edition: $($s.Edition)  Version: $($s.Version)"
  } | Tee-Object -FilePath $f -Append
} else { 'No SQL Server instances found in the registry.' | Tee-Object -FilePath $f -Append }
Get-Service -Name 'MSSQL*','SQLAgent*' -ErrorAction SilentlyContinue |
  Select-Object Name, Status, StartType | Format-Table -AutoSize | Out-String | Tee-Object -FilePath $f -Append

Section 'Tools present'
"PowerShell: $($PSVersionTable.PSVersion)" | Tee-Object -FilePath $f -Append
foreach ($t in 'sqlcmd','node','git') {
  $c = Get-Command $t -ErrorAction SilentlyContinue
  "$t : $(if ($c) { $c.Source } else { 'not found' })" | Tee-Object -FilePath $f -Append
}

Section 'Outbound HTTPS'
foreach ($h in 'graph.microsoft.com','login.microsoftonline.com','outlook.office365.com','openrouter.ai') {
  $r = Test-NetConnection -ComputerName $h -Port 443 -WarningAction SilentlyContinue
  "$h : $(if ($r.TcpTestSucceeded) { 'reachable' } else { 'BLOCKED' })" | Tee-Object -FilePath $f -Append
}

"`nDone. Copy $f off the server; it contains no client data." | Tee-Object -FilePath $f -Append
