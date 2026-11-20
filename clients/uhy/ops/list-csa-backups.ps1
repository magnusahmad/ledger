# UHY-ASK pilot, Stage 1: list files in the CSA backup folder (names, sizes, dates only). Read-only.
$out = 'C:\uhy-pilot\out'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$f = Join-Path $out 'csa-backups.txt'
"CSA backup folder listing, $(Get-Date -Format s)" | Out-File -FilePath $f -Encoding UTF8
foreach ($p in 'E:\CSA Backup', 'E:\') {
  if (Test-Path $p) {
    "`n=== $p ===" | Out-File -FilePath $f -Append -Encoding UTF8
    Get-ChildItem -Path $p -Recurse -ErrorAction SilentlyContinue | Where-Object { -not $_.PSIsContainer } |
      Sort-Object LastWriteTime -Descending | Select-Object -First 40 |
      ForEach-Object { '{0:yyyy-MM-dd HH:mm}  {1,10:N1} MB  {2}' -f $_.LastWriteTime, ($_.Length / 1MB), $_.FullName } |
      Out-File -FilePath $f -Append -Encoding UTF8
  }
}
"`n=== Scheduled tasks mentioning backup or CSA ===" | Out-File -FilePath $f -Append -Encoding UTF8
schtasks /query /fo LIST /v 2>$null | Select-String -Pattern 'TaskName|Task To Run|Next Run Time|Schedule Type|Start Time' |
  ForEach-Object { $_.Line } | Out-String -Stream |
  Where-Object { $_ } | Out-File -FilePath "$f.tmp" -Encoding UTF8
$lines = Get-Content "$f.tmp"; Remove-Item "$f.tmp"
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'TaskName' -and (($lines[$i..([math]::Min($i+4,$lines.Count-1))] -join ' ') -match '(?i)backup|csa|sql')) {
    $lines[$i..([math]::Min($i+4,$lines.Count-1))] | Out-File -FilePath $f -Append -Encoding UTF8
    '' | Out-File -FilePath $f -Append -Encoding UTF8
  }
}
Get-Content $f
