# UHY-ASK pilot, Stage 1: find the Access admin database and the DN (Debit Note) workbooks on this
# server's shares. Read-only: lists file names, paths, sizes and dates; never opens a file.
# PowerShell 2.0 compatible (Windows Server 2008 R2). Run via 6-find-source-files.cmd.
#
# The list stays on the server in C:\uhy-pilot\out\source-files.txt. Read it on screen. Paths may
# include client names (client folders), so copy off only the lines for the DN workbooks and the
# Access database, not the whole file.
param([string[]] $Roots = @())
$out = 'C:\uhy-pilot\out'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }
$f = Join-Path $out 'source-files.txt'

# Disk shares only, without admin, logon and domain-controller shares.
if ($Roots.Count -eq 0) {
  $skip = @('ADMIN$', 'IPC$', 'print$', 'NETLOGON', 'SYSVOL', 'CSA Backup')
  $Roots = @(Get-WmiObject -Class Win32_Share -ErrorAction SilentlyContinue |
    Where-Object { $_.Type -eq 0 -and $skip -notcontains $_.Name -and $_.Name -notmatch '^[A-Z]\$$' -and $_.Path } |
    ForEach-Object { $_.Path })
}

"Source file search, $(Get-Date -Format s)" | Out-File -FilePath $f -Encoding UTF8
"Searched: $($Roots -join '; ')" | Out-File -FilePath $f -Append -Encoding UTF8

$access = @(); $dn = @(); $locks = @()
foreach ($root in $Roots) {
  if (-not (Test-Path $root)) { "Not found: $root" | Out-File -FilePath $f -Append -Encoding UTF8; continue }
  Get-ChildItem -Path $root -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { -not $_.PSIsContainer } |
    ForEach-Object {
      $n = $_.Name
      if ($n -match '(?i)\.(accdb|mdb)$') { $access += $_ }
      elseif ($n -match '(?i)\.(laccdb|ldb)$') { $locks += $_ }
      elseif ($n -match '(?i)\.(xlsx|xlsm|xls)$' -and $n -notmatch '^~\$' -and ($n -match '(?i)debit' -or $n -match '(^|[^A-Za-z])DN([^A-Za-z]|$)')) { $dn += $_ }
    }
}

function Write-List($title, $items) {
  "`n=== $title ($($items.Count)) ===" | Out-File -FilePath $f -Append -Encoding UTF8
  $items | Sort-Object LastWriteTime -Descending | ForEach-Object {
    '{0:yyyy-MM-dd HH:mm}  {1,9:N1} MB  {2}' -f $_.LastWriteTime, ($_.Length / 1MB), $_.FullName
  } | Out-File -FilePath $f -Append -Encoding UTF8
}
Write-List 'Access databases (.accdb, .mdb)' $access
Write-List 'Access lock files (.laccdb, .ldb): the database is the .accdb/.mdb with the same name beside it' $locks
Write-List 'DN workbooks (name contains Debit or DN)' $dn
Get-Content $f
