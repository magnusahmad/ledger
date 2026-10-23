# UHY-ASK pilot, Stage 1: server facts. Read-only.
# Works on Windows PowerShell 2.0 and later (no CIM, Tee-Object -Append or Test-NetConnection).
# Output: C:\uhy-pilot\out\server-facts.txt (also printed to the window).
$ErrorActionPreference = 'Continue'
$out = 'C:\uhy-pilot\out'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$f = Join-Path $out 'server-facts.txt'

function W($text) { $text | Out-File -FilePath $f -Append -Encoding UTF8; $text }
function Section($t) { W ''; W "=== $t ===" }
function Try-Run($label, [scriptblock] $block) {
  try { $r = & $block | Out-String; W $r.TrimEnd() }
  catch { W "ERROR in ${label}: $($_.Exception.Message)" }
}

"UHY pilot server assessment $(Get-Date -Format s)" | Out-File -FilePath $f -Encoding UTF8
"UHY pilot server assessment $(Get-Date -Format s)"

Section 'PowerShell and .NET'
W "PowerShell: $($PSVersionTable.PSVersion)"
W "CLR: $($PSVersionTable.CLRVersion)"
Try-Run '.NET 4.x' {
  $k = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full' -ErrorAction SilentlyContinue
  if ($k) { ".NET 4 release key: $($k.Release) (528040 or higher = 4.8)" } else { '.NET 4.x not found' }
}

Section 'Operating system'
Try-Run 'OS' {
  $os = Get-WmiObject Win32_OperatingSystem
  "Caption: $($os.Caption)"
  "Version: $($os.Version)  Build: $($os.BuildNumber)  Architecture: $($os.OSArchitecture)"
  "Service pack: $($os.CSDVersion)"
  "Memory total GB: $([math]::Round($os.TotalVisibleMemorySize/1MB,1))  free GB: $([math]::Round($os.FreePhysicalMemory/1MB,1))"
}

Section 'CPU'
Try-Run 'CPU' { Get-WmiObject Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, LoadPercentage | Format-Table -AutoSize }

Section 'Disks'
Try-Run 'Disks' {
  Get-WmiObject Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {
    '{0} {1}  size {2} GB  free {3} GB' -f $_.DeviceID, $_.VolumeName, [math]::Round($_.Size/1GB,1), [math]::Round($_.FreeSpace/1GB,1)
  }
}

Section 'Shares on this server'
Try-Run 'Shares' { Get-WmiObject Win32_Share | Where-Object { $_.Name -notmatch '\$$' } | Select-Object Name, Path | Format-Table -AutoSize }

Section 'Domain'
Try-Run 'Domain' { $cs = Get-WmiObject Win32_ComputerSystem; "Name: $($cs.Name)  Domain: $($cs.Domain)  PartOfDomain: $($cs.PartOfDomain)" }

Section 'SQL Server instances'
Try-Run 'SQL registry' {
  $paths = 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL',
           'HKLM:\SOFTWARE\Wow6432Node\Microsoft\Microsoft SQL Server\Instance Names\SQL'
  $found = $false
  foreach ($p in $paths) {
    if (Test-Path $p) {
      $props = Get-ItemProperty $p
      foreach ($prop in $props.PSObject.Properties) {
        if ($prop.Name -like 'PS*') { continue }
        $found = $true
        $root = Split-Path (Split-Path (Split-Path $p))
        $s = Get-ItemProperty "$root\$($prop.Value)\Setup" -ErrorAction SilentlyContinue
        $conn = if ($prop.Name -eq 'MSSQLSERVER') { 'localhost' } else { "localhost\$($prop.Name)" }
        "Instance: $($prop.Name)  connect as: $conn  Edition: $($s.Edition)  Version: $($s.Version)"
      }
    }
  }
  if (-not $found) { 'No SQL Server instances found in the registry.' }
}
Try-Run 'SQL services' { Get-Service | Where-Object { $_.Name -like 'MSSQL*' -or $_.Name -like 'SQLAgent*' } | Select-Object Name, Status | Format-Table -AutoSize }

Section 'Tools present'
foreach ($t in 'sqlcmd','node','git') {
  $c = Get-Command $t -ErrorAction SilentlyContinue
  if ($c) { W "${t}: $($c.Definition)" } else { W "${t}: not found" }
}

Section 'Outbound HTTPS (TCP 443)'
foreach ($h in 'graph.microsoft.com','login.microsoftonline.com','outlook.office365.com','openrouter.ai') {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $ar = $tcp.BeginConnect($h, 443, $null, $null)
    $ok = $ar.AsyncWaitHandle.WaitOne(5000, $false) -and $tcp.Connected
    $tcp.Close()
    if ($ok) { W "${h}: reachable" } else { W "${h}: BLOCKED or timed out" }
  } catch { W "${h}: ERROR $($_.Exception.Message)" }
}

W ''
W "Done. Copy $f off the server; it contains no client data."
